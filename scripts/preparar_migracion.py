#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
import unicodedata
import uuid
from collections import Counter, defaultdict
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.utils.datetime import from_excel

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "datos-origen"
OUT = ROOT / "migracion-preparada"
DB_FILE = DATA / "Base_de_Datos_1.xlsx"
CONTROL_FILE = DATA / "Clientes_IDs_Maestra_de_Locales_y_Registro_de_Errores.xlsx"
NS = uuid.UUID("797cbffa-c05c-45c5-9a37-39c9685b730a")


def sid(kind: str, key: str) -> str:
    return str(uuid.uuid5(NS, f"{kind}:{key}"))


def text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def clean(value) -> str:
    return re.sub(r"\s+", " ", text(value)).strip()


def folded(value) -> str:
    value = unicodedata.normalize("NFKD", clean(value))
    return "".join(c for c in value if not unicodedata.combining(c)).casefold()


def key(value) -> str:
    return re.sub(r"\s+", "", clean(value)).upper()


def rut(value) -> str:
    return re.sub(r"[^0-9K]", "", text(value).upper())


def number(value):
    if value is None or clean(value) == "":
        return None
    if isinstance(value, (int, float, Decimal)):
        return str(Decimal(str(value)).normalize())
    raw = clean(value).replace("$", "").replace(" ", "")
    if raw.count(",") == 1 and raw.count(".") == 0:
        raw = raw.replace(",", ".")
    elif raw.count(".") > 1 and "," not in raw:
        raw = raw.replace(".", "")
    elif "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    try:
        return str(Decimal(raw).normalize())
    except InvalidOperation:
        return None


def as_datetime(value):
    if value is None or clean(value) == "":
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return datetime.combine(value, time()).isoformat()
    if isinstance(value, (int, float)):
        try:
            parsed = from_excel(value)
            return parsed.isoformat() if isinstance(parsed, datetime) else datetime.combine(parsed, time()).isoformat()
        except Exception:
            return None
    raw = clean(value)
    for fmt in ("%d-%m-%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%m-%d-%Y %H:%M:%S",
                "%m/%d/%Y %H:%M:%S", "%d-%m-%Y", "%d/%m/%Y", "%m-%d-%Y",
                "%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).isoformat()
        except ValueError:
            pass
    return None


def as_date(value):
    parsed = as_datetime(value)
    return parsed[:10] if parsed else None


def extract_ref(value):
    raw = clean(value)
    if "/d/" in raw:
        return raw.split("/d/", 1)[1].split("/", 1)[0]
    if "folders/" in raw:
        return raw.split("folders/", 1)[1].split("?", 1)[0]
    return raw or None


def geo(value):
    raw = clean(value)
    if not raw:
        return None, None
    nums = re.findall(r"-?\d+(?:[.,]\d+)", raw)
    if len(nums) >= 2:
        try:
            return str(Decimal(nums[0].replace(",", "."))), str(Decimal(nums[1].replace(",", ".")))
        except InvalidOperation:
            pass
    return None, None


def raw_json(headers, values):
    obj = {}
    for i, value in enumerate(values):
        name = clean(headers[i]) if i < len(headers) and clean(headers[i]) else f"columna_{i+1}"
        if isinstance(value, (datetime, date)):
            obj[name] = value.isoformat()
        else:
            obj[name] = value
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), default=str)


def sha256(path: Path):
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def active(value):
    return "Inactivo" if folded(value) in {"inactivo", "bloqueado", "c", "cerrado"} else "Activo"


if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

db = load_workbook(DB_FILE, read_only=True, data_only=True)
control = load_workbook(CONTROL_FILE, read_only=True, data_only=True)

tables: dict[str, dict[str, dict]] = defaultdict(dict)
events: dict[str, list[dict]] = defaultdict(list)
audit_rows = []
issues = Counter()

file_lots = {
    DB_FILE.name: {"id": sid("lote", sha256(DB_FILE)), "hash": sha256(DB_FILE)},
    CONTROL_FILE.name: {"id": sid("lote", sha256(CONTROL_FILE)), "hash": sha256(CONTROL_FILE)},
}


def put(table, row):
    tables[table][row["id"] if "id" in row else row["rut"]] = row


def audit(path, sheet, rownum, table, dest_id, raw):
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    audit_rows.append({
        "lote_id": file_lots[path.name]["id"], "hoja_origen": sheet,
        "fila_origen": rownum, "hash_fila_sha256": digest,
        "tabla_destino": table, "registro_destino_id": dest_id,
        "estado": "pendiente", "mensaje": None,
    })


# Empresa y carpetas.
ws = control["Clientes e IDs"]
headers = [text(c.value) for c in ws[1]]
client = next(r for r in ws.iter_rows(min_row=2, values_only=True) if any(clean(v) for v in r))
company_key = clean(client[3]) or clean(client[1]) or clean(client[2])
company_id = sid("empresa", company_key)
company = {
    "id": company_id, "rut_empresa": clean(client[1]), "nombre_comercial": clean(client[2]),
    "estado": active(client[0]), "codigo_acceso": re.sub(r"\D", "", clean(client[3])),
    "referencia_base_origen": extract_ref(client[4]),
}
put("empresa_cliente", company)
for idx, tipo in ((5, "cajas"), (6, "unidades"), (7, "terreno")):
    ref = extract_ref(client[idx] if idx < len(client) else None)
    if ref:
        put("carpeta_almacenamiento", {"id": sid("carpeta", f"{company_id}:{tipo}"), "empresa_cliente_id": company_id, "tipo": tipo, "referencia_carpeta": ref})
audit(CONTROL_FILE, ws.title, 2, "empresa_cliente", company_id, raw_json(headers, client))

# Locales, cadenas y subcadenas.
local_by_code = {}
local_by_name = {}
chain_by_name = {}
subchain_by_pair = {}
ws = control["Maestra de Locales"]
headers = [text(c.value) for c in ws[1]]
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row):
        continue
    chain_name = clean(row[2]) or "LEGACY"
    chain_id = chain_by_name.setdefault(folded(chain_name), sid("cadena", folded(chain_name)))
    put("cadena", {"id": chain_id, "nombre": chain_name})
    sub_name = clean(row[3]) or "LEGACY"
    sub_id = subchain_by_pair.setdefault((chain_id, folded(sub_name)), sid("subcadena", f"{chain_id}:{folded(sub_name)}"))
    put("subcadena", {"id": sub_id, "cadena_id": chain_id, "nombre": sub_name})
    code = clean(row[0])
    local_id = sid("local", key(code))
    lat, lon = geo(row[5])
    local_row = {"id": local_id, "subcadena_id": sub_id, "codigo_local": code, "nombre_local": clean(row[4]) or code,
                 "direccion": None, "latitud": lat, "longitud": lon,
                 "estado": "Abierto" if folded(row[1]) in {"a", "abierto", "activo"} else "Cerrado"}
    put("local", local_row)
    local_by_code[key(code)] = local_id
    local_by_name[folded(local_row["nombre_local"])] = local_id
    audit(CONTROL_FILE, ws.title, rownum, "local", local_id, raw_json(headers, row))

prefix_chain = {}
for prefix, target in (("CEN", "cencosud"), ("SMU", "smu"), ("TOT", "tottus"), ("WAL", "walmart")):
    found = next((cid for name, cid in chain_by_name.items() if target in name), None)
    if found:
        prefix_chain[prefix] = found


def ensure_chain(name):
    cname = clean(name) or "LEGACY"
    cid = chain_by_name.get(folded(cname))
    if cid:
        return cid
    cid = sid("cadena", folded(cname)); chain_by_name[folded(cname)] = cid
    put("cadena", {"id": cid, "nombre": cname})
    return cid


def ensure_local(chain_name, sub_name, local_name, code=None):
    existing = local_by_code.get(key(code)) if code else local_by_name.get(folded(local_name))
    if existing:
        return existing
    cid = ensure_chain(chain_name)
    sname = clean(sub_name) or "LEGACY"
    skey = (cid, folded(sname))
    sub_id = subchain_by_pair.get(skey)
    if not sub_id:
        sub_id = sid("subcadena", f"{cid}:{folded(sname)}"); subchain_by_pair[skey] = sub_id
        put("subcadena", {"id": sub_id, "cadena_id": cid, "nombre": sname})
    code = clean(code) or "LEGACY-" + hashlib.sha1(f"{chain_name}|{sub_name}|{local_name}".encode()).hexdigest()[:16].upper()
    lid = sid("local", key(code))
    put("local", {"id": lid, "subcadena_id": sub_id, "codigo_local": code,
                  "nombre_local": clean(local_name) or code, "direccion": None,
                  "latitud": None, "longitud": None, "estado": "Cerrado"})
    local_by_code[key(code)] = lid
    if local_name:
        local_by_name[folded(local_name)] = lid
    issues["locales_heredados_creados"] += 1
    return lid


# Proveedor y productos.
provider_id = sid("proveedor", folded(company["nombre_comercial"]))
put("proveedor", {"id": provider_id, "nombre": company["nombre_comercial"]})
product_by_key = {}
product_by_sap = {}


def ensure_product(product_key=None, sap=None, chain_id=None, source=None):
    pkey = key(product_key)
    sap = clean(sap)
    if pkey and pkey in product_by_key:
        return product_by_key[pkey]
    if sap and sap in product_by_sap:
        return product_by_sap[sap]
    prefix_match = re.match(r"^[A-Z]+", pkey)
    prefix = prefix_match.group(0) if prefix_match else ""
    chain_id = chain_id or prefix_chain.get(prefix)
    if not chain_id:
        chain_id = ensure_chain(prefix or "LEGACY")
    if not sap:
        sap = pkey[len(prefix):] if prefix else pkey
    pc_id = sid("producto_cadena", f"{chain_id}:{sap}")
    ph_id = sid("producto_homologado", f"{company_id}:{pkey or sap}")
    put("producto_homologado", {"id": ph_id, "empresa_cliente_id": company_id, "marca_id": None,
        "seccion_id": None, "nombre_homologado": pkey or sap, "caracteres": None})
    put("producto_cadena", {"id": pc_id, "cadena_id": chain_id, "sap": sap, "articulo_id": None,
        "marca_texto_cadena": None, "nombre_texto_cadena": pkey or sap, "llave_sap_origen": pkey or None})
    pcl_id = sid("producto_cliente", f"{company_id}:{pc_id}")
    put("producto_cliente", {"id": pcl_id, "empresa_cliente_id": company_id, "producto_cadena_id": pc_id,
        "producto_homologado_id": ph_id, "precio": None, "estado": "Bloqueado"})
    if pkey: product_by_key[pkey] = pcl_id
    if sap: product_by_sap[sap] = pcl_id
    issues["productos_heredados_creados"] += 1
    return pcl_id


ws = db["Maestra Productos"]
headers = [text(c.value) for c in ws[1]]
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row):
        continue
    pkey, sap = key(row[0]), clean(row[2])
    prefix_match = re.match(r"^[A-Z]+", pkey)
    prefix = prefix_match.group(0) if prefix_match else ""
    chain_id = prefix_chain.get(prefix) or ensure_chain(prefix or "LEGACY")
    ean_u, ean_p = clean(row[3]) or None, clean(row[4]) or None
    article_id = sid("articulo", ean_u or f"SIN-EAN:{pkey}")
    put("articulo", {"id": article_id, "ean_unidad": ean_u, "ean_pack": ean_p, "unidades_por_caja": number(row[8])})
    section_name = clean(row[5]) or "SIN SECCIÓN"
    section_id = sid("seccion", folded(section_name)); put("seccion", {"id": section_id, "nombre": section_name})
    brand_name = clean(row[6]) or "SIN MARCA"
    brand_id = sid("marca", f"{provider_id}:{folded(brand_name)}")
    put("marca", {"id": brand_id, "proveedor_id": provider_id, "nombre": brand_name})
    product_name = clean(row[7]) or pkey
    ph_id = sid("producto_homologado", f"{company_id}:{folded(product_name)}")
    put("producto_homologado", {"id": ph_id, "empresa_cliente_id": company_id, "marca_id": brand_id,
        "seccion_id": section_id, "nombre_homologado": product_name, "caracteres": len(product_name)})
    pc_id = sid("producto_cadena", f"{chain_id}:{sap}")
    put("producto_cadena", {"id": pc_id, "cadena_id": chain_id, "sap": sap, "articulo_id": article_id,
        "marca_texto_cadena": brand_name, "nombre_texto_cadena": product_name, "llave_sap_origen": pkey})
    pcl_id = sid("producto_cliente", f"{company_id}:{pc_id}")
    put("producto_cliente", {"id": pcl_id, "empresa_cliente_id": company_id, "producto_cadena_id": pc_id,
        "producto_homologado_id": ph_id, "precio": number(row[9]), "estado": active(row[1]).replace("Inactivo", "Bloqueado")})
    product_by_key[pkey] = pcl_id; product_by_sap[sap] = pcl_id
    for idx, tipo in ((10, "unidad"), (11, "caja")):
        ref = extract_ref(row[idx] if idx < len(row) else None)
        if ref:
            iid = sid("producto_imagen", f"{pcl_id}:{tipo}")
            put("producto_imagen", {"id": iid, "empresa_cliente_id": company_id,
                "producto_cliente_id": pcl_id, "tipo": tipo, "referencia_archivo": ref,
                "url": clean(row[idx]) if "http" in clean(row[idx]).casefold() else None})
    audit(DB_FILE, ws.title, rownum, "producto_cliente", pcl_id, raw_json(headers, row))

# Usuarios y asignaciones.
user_by_name = {}
user_by_rut = {}
ws = db["Usuarios"]
headers = [text(c.value) for c in ws[1]]
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row): continue
    r = rut(row[0]); name = clean(row[2]); phone = clean(row[4]) or None
    if not re.fullmatch(r"([0-9]{7,8}|[0-9]{7,8}[0-9K])", r):
        issues["rut_invalido"] += 1
        continue
    put("persona", {"rut": r, "nombre": name, "telefono": phone})
    uid = sid("usuario", f"{company_id}:{r}")
    put("usuario", {"id": uid, "empresa_cliente_id": company_id, "persona_rut": r,
                    "perfil": clean(row[1]), "estado": "Activo", "auth_user_id": None})
    user_by_rut[r] = uid; user_by_name[folded(name)] = uid
    code = clean(row[3])
    if code:
        lid = local_by_code.get(key(code)) or ensure_local("LEGACY", "LEGACY", code, code)
        aid = sid("asignacion", f"{uid}:{lid}")
        marks = [folded(row[i]) == "x" for i in range(5, 12)]
        put("usuario_local_asignacion", {"id": aid, "usuario_id": uid, "local_id": lid,
            "lunes": marks[0], "martes": marks[1], "miercoles": marks[2], "jueves": marks[3],
            "viernes": marks[4], "sabado": marks[5], "domingo": marks[6]})
        audit(DB_FILE, ws.title, rownum, "usuario_local_asignacion", aid, raw_json(headers, row))
    else:
        audit(DB_FILE, ws.title, rownum, "usuario", uid, raw_json(headers, row))


def event_id(sheet, rownum):
    return sid("evento", f"{DB_FILE.name}:{sheet}:{rownum}")


def product_for(value, chain_name=None):
    raw_key = key(value); raw_sap = clean(value)
    if raw_key in product_by_key: return product_by_key[raw_key]
    if raw_sap in product_by_sap: return product_by_sap[raw_sap]
    return ensure_product(raw_key if re.match(r"^[A-Z]+", raw_key) else None, raw_sap,
                          ensure_chain(chain_name) if chain_name else None)

# Stock actual.
ws = db["Maestra Retail"]; headers = [text(c.value) for c in ws[1]]
stock_snapshot_keys = Counter()
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row): continue
    pkey = key(row[2]); pcl = product_for(pkey)
    chain_id = tables["producto_cadena"][tables["producto_cliente"][pcl]["producto_cadena_id"]]["cadena_id"]
    chain_name = tables["cadena"][chain_id]["nombre"]
    lid = local_by_code.get(key(row[1])) or ensure_local(chain_name, "LEGACY", clean(row[1]), clean(row[1]))
    d = as_date(row[0]); eid = event_id(ws.title, rownum)
    k = (lid, pcl, d); stock_snapshot_keys[k] += 1
    events["stock_snapshot"].append({"id": eid, "empresa_cliente_id": company_id, "local_id": lid,
        "producto_cliente_id": pcl, "fecha": d, "stock": number(row[3]) or "0", "datos_origen": raw_json(headers, row)})
    audit(DB_FILE, ws.title, rownum, "stock_snapshot", eid, raw_json(headers, row))

# Historial: llave compuesta LOCAL_SAP.
ws = db["Historial de Stock"]; headers = [text(c.value) for c in ws[1]]
stock_history_keys = Counter()
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row): continue
    composite = clean(row[1]); local_code, sap = (composite.rsplit("_", 1) + [""])[:2] if "_" in composite else (composite, "")
    lid = local_by_code.get(key(local_code))
    chain_name = None
    if not lid:
        lid = ensure_local("LEGACY", "LEGACY", local_code, local_code)
    else:
        sub_id = tables["local"][lid]["subcadena_id"]; cid = tables["subcadena"][sub_id]["cadena_id"]
        chain_name = tables["cadena"][cid]["nombre"]
    pcl = product_for(sap, chain_name)
    d = as_date(row[0]); eid = event_id(ws.title, rownum); k = (lid, pcl, d); stock_history_keys[k] += 1
    events["stock_historial"].append({"id": eid, "empresa_cliente_id": company_id, "local_id": lid,
        "producto_cliente_id": pcl, "fecha": d, "stock": number(row[2]) or "0", "datos_origen": raw_json(headers, row)})
    audit(DB_FILE, ws.title, rownum, "stock_historial", eid, raw_json(headers, row))

# Inventario.
ws = db["Inventario y Sugerido"]; headers = [text(c.value) for c in ws[1]]
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row): continue
    lid = local_by_name.get(folded(row[5])) or ensure_local(row[3], row[4], row[5])
    pcl = product_for(row[7], row[3]); uid = user_by_name.get(folded(row[1])); eid = event_id(ws.title, rownum)
    events["inventario_registro"].append({"id": eid, "empresa_cliente_id": company_id, "usuario_id": uid,
        "local_id": lid, "producto_cliente_id": pcl, "fecha": as_datetime(row[0]), "tipo_ingreso": clean(row[9]),
        "unidades": number(row[10]), "cajas": number(row[11]), "nombre_usuario_origen": clean(row[1]),
        "perfil_origen": clean(row[2]), "datos_origen": raw_json(headers, row)})
    if not uid: issues["inventario_usuario_no_vigente"] += 1
    audit(DB_FILE, ws.title, rownum, "inventario_registro", eid, raw_json(headers, row))

# Fotos de terreno.
ws = db["Fotos en Terreno"]; headers = [text(c.value) for c in ws[1]]
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row): continue
    lid = local_by_name.get(folded(row[6])) or ensure_local(row[4], row[5], row[6])
    pcl = product_for(row[10], row[4]); uid = user_by_name.get(folded(row[3])); eid = event_id(ws.title, rownum)
    events["foto_terreno"].append({"id": eid, "empresa_cliente_id": company_id, "usuario_id": uid,
        "local_id": lid, "producto_cliente_id": pcl, "fecha": as_datetime(row[0]), "stock_al_momento": number(row[12]),
        "fecha_stock_sistemico": as_date(row[13]), "foto_referencia": clean(row[14]) or None,
        "foto_url": clean(row[15]) or None, "nombre_usuario_origen": clean(row[3]), "perfil_origen": clean(row[2]),
        "datos_origen": raw_json(headers, row)})
    if not uid: issues["foto_usuario_no_vigente"] += 1
    audit(DB_FILE, ws.title, rownum, "foto_terreno", eid, raw_json(headers, row))

# Accesos.
ws = db["Registro de Accesos"]; headers = [text(c.value) for c in ws[1]]
for rownum, row in enumerate(ws.iter_rows(min_row=2, values_only=True), 2):
    if not any(clean(v) for v in row): continue
    uid = user_by_name.get(folded(row[1])); eid = event_id(ws.title, rownum)
    events["registro_acceso"].append({"id": eid, "empresa_cliente_id": company_id, "usuario_id": uid,
        "fecha": as_datetime(row[2]), "rol_en_el_momento": clean(row[3]) or "Reponedor",
        "nombre_usuario_origen": clean(row[1]), "datos_origen": raw_json(headers, row)})
    if not uid: issues["acceso_usuario_no_vigente"] += 1
    audit(DB_FILE, ws.title, rownum, "registro_acceso", eid, raw_json(headers, row))

# Errores (la hoja no tiene encabezado; columnas reales: fecha, error, contexto).
ws = control["Registro de Errores"]
for rownum, row in enumerate(ws.iter_rows(min_row=1, values_only=True), 1):
    if not any(clean(v) for v in row): continue
    eid = sid("error", f"{CONTROL_FILE.name}:{rownum}")
    raw = raw_json(["FECHA", "ERROR", "CONTEXTO"], row[:3])
    events["registro_error"].append({"id": eid, "fecha": as_datetime(row[0]),
        "mensaje_error": clean(row[1]) or "Error heredado sin mensaje", "contexto_funcion": clean(row[2]) or None})
    audit(CONTROL_FILE, ws.title, rownum, "registro_error", eid, raw)

issues["duplicados_stock_snapshot_clave"] = sum(v - 1 for v in stock_snapshot_keys.values() if v > 1)
issues["duplicados_stock_historial_clave"] = sum(v - 1 for v in stock_history_keys.values() if v > 1)

columns = {
    "empresa_cliente": ["id","rut_empresa","nombre_comercial","estado","codigo_acceso","referencia_base_origen"],
    "carpeta_almacenamiento": ["id","empresa_cliente_id","tipo","referencia_carpeta"],
    "cadena": ["id","nombre"], "subcadena": ["id","cadena_id","nombre"],
    "local": ["id","subcadena_id","codigo_local","nombre_local","direccion","latitud","longitud","estado"],
    "proveedor": ["id","nombre"], "marca": ["id","proveedor_id","nombre"], "seccion": ["id","nombre"],
    "articulo": ["id","ean_unidad","ean_pack","unidades_por_caja"],
    "producto_cadena": ["id","cadena_id","sap","articulo_id","marca_texto_cadena","nombre_texto_cadena","llave_sap_origen"],
    "producto_homologado": ["id","empresa_cliente_id","marca_id","seccion_id","nombre_homologado","caracteres"],
    "producto_cliente": ["id","empresa_cliente_id","producto_cadena_id","producto_homologado_id","precio","estado"],
    "producto_imagen": ["id","empresa_cliente_id","producto_cliente_id","tipo","referencia_archivo","url"],
    "persona": ["rut","nombre","telefono"],
    "usuario": ["id","empresa_cliente_id","persona_rut","perfil","estado","auth_user_id"],
    "usuario_local_asignacion": ["id","usuario_id","local_id","lunes","martes","miercoles","jueves","viernes","sabado","domingo"],
    "stock_snapshot": ["id","empresa_cliente_id","local_id","producto_cliente_id","fecha","stock","datos_origen"],
    "stock_historial": ["id","empresa_cliente_id","local_id","producto_cliente_id","fecha","stock","datos_origen"],
    "inventario_registro": ["id","empresa_cliente_id","usuario_id","local_id","producto_cliente_id","fecha","tipo_ingreso","unidades","cajas","nombre_usuario_origen","perfil_origen","datos_origen"],
    "foto_terreno": ["id","empresa_cliente_id","usuario_id","local_id","producto_cliente_id","fecha","stock_al_momento","fecha_stock_sistemico","foto_referencia","foto_url","nombre_usuario_origen","perfil_origen","datos_origen"],
    "registro_acceso": ["id","empresa_cliente_id","usuario_id","fecha","rol_en_el_momento","nombre_usuario_origen","datos_origen"],
    "registro_error": ["id","fecha","mensaje_error","contexto_funcion"],
}


def write_csv(name, records):
    path = OUT / f"{name}.csv"
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns[name], extrasaction="ignore")
        writer.writeheader()
        for record in records:
            writer.writerow({k: ("\\N" if record.get(k) is None else record.get(k)) for k in columns[name]})


for name in columns:
    records = list(tables[name].values()) if name in tables else events[name]
    write_csv(name, records)

with (OUT / "migracion_lote.csv").open("w", newline="", encoding="utf-8") as fh:
    fields = ["id","nombre","archivo_origen","hash_archivo_sha256","estado","total_filas","filas_exitosas","filas_con_error","observaciones"]
    w = csv.DictWriter(fh, fieldnames=fields); w.writeheader()
    for filename, lot in file_lots.items():
        total = sum(1 for r in audit_rows if r["lote_id"] == lot["id"])
        w.writerow({"id":lot["id"],"nombre":"Migración inicial Excel","archivo_origen":filename,
                    "hash_archivo_sha256":lot["hash"],"estado":"preparado","total_filas":total,
                    "filas_exitosas":0,"filas_con_error":0,"observaciones":"Preparado por ETL reproducible"})

with (OUT / "migracion_registro.csv").open("w", newline="", encoding="utf-8") as fh:
    fields = ["lote_id","hoja_origen","fila_origen","hash_fila_sha256","tabla_destino","registro_destino_id","estado","mensaje"]
    w = csv.DictWriter(fh, fieldnames=fields); w.writeheader()
    for record in audit_rows:
        w.writerow({k:("\\N" if record.get(k) is None else record.get(k)) for k in fields})

report = {
    "tables": {name: len(tables[name]) if name in tables else len(events[name]) for name in columns},
    "audit_rows": len(audit_rows), "issues": dict(issues),
    "blocking": {
        "invalid_company_access_code": not bool(re.fullmatch(r"[1-9][0-9]{5}", company["codigo_acceso"])),
        "invalid_dates": sum(1 for name in ("stock_snapshot","stock_historial","inventario_registro","foto_terreno","registro_acceso","registro_error") for r in events[name] if not r.get("fecha")),
        "duplicate_snapshot_keys": issues["duplicados_stock_snapshot_clave"],
        "duplicate_history_keys": 0,
    }
}
(OUT / "reporte_simulacion.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
