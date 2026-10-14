\set ON_ERROR_STOP on

-- Deterministic synthetic data: two tenants and every currently supported profile.
-- UUID prefixes identify the entity family and make failed assertions easy to read.

insert into auth.users (id, email) values
  ('30000000-0000-4000-8001-000000000001', 'admin.a@integration.invalid'),
  ('30000000-0000-4000-8001-000000000002', 'supervisor.a@integration.invalid'),
  ('30000000-0000-4000-8001-000000000003', 'reponedor.a@integration.invalid'),
  ('30000000-0000-4000-8001-000000000004', 'externo.a@integration.invalid'),
  ('30000000-0000-4000-8002-000000000001', 'admin.b@integration.invalid'),
  ('30000000-0000-4000-8002-000000000002', 'supervisor.b@integration.invalid'),
  ('30000000-0000-4000-8002-000000000003', 'reponedor.b@integration.invalid'),
  ('30000000-0000-4000-8002-000000000004', 'externo.b@integration.invalid');

insert into public.empresa_cliente
  (id, rut_empresa, nombre_comercial, estado, codigo_acceso)
values
  ('10000000-0000-4000-8000-000000000001', '76000001K', 'Tenant Integracion A', 'Activo', '100001'),
  ('10000000-0000-4000-8000-000000000002', '760000028', 'Tenant Integracion B', 'Activo', '100002');

insert into public.persona (rut, nombre, telefono) values
  ('10000001', 'Administrador Tenant A', '+56000000001'),
  ('10000002', 'Supervisor Tenant A', '+56000000002'),
  ('10000003', 'Reponedor Tenant A', '+56000000003'),
  ('10000004', 'Reponedor Externo Tenant A', '+56000000004'),
  ('20000001', 'Administrador Tenant B', '+56000000101'),
  ('20000002', 'Supervisor Tenant B', '+56000000102'),
  ('20000003', 'Reponedor Tenant B', '+56000000103'),
  ('20000004', 'Reponedor Externo Tenant B', '+56000000104');

insert into public.usuario
  (id, empresa_cliente_id, persona_rut, perfil, estado, auth_user_id)
values
  ('20000000-0000-4000-8001-000000000001', '10000000-0000-4000-8000-000000000001', '10000001', 'Administrador', 'Activo', '30000000-0000-4000-8001-000000000001'),
  ('20000000-0000-4000-8001-000000000002', '10000000-0000-4000-8000-000000000001', '10000002', 'Supervisor', 'Activo', '30000000-0000-4000-8001-000000000002'),
  ('20000000-0000-4000-8001-000000000003', '10000000-0000-4000-8000-000000000001', '10000003', 'Reponedor', 'Activo', '30000000-0000-4000-8001-000000000003'),
  ('20000000-0000-4000-8001-000000000004', '10000000-0000-4000-8000-000000000001', '10000004', 'Reponedor Externo', 'Activo', '30000000-0000-4000-8001-000000000004'),
  ('20000000-0000-4000-8002-000000000001', '10000000-0000-4000-8000-000000000002', '20000001', 'Administrador', 'Activo', '30000000-0000-4000-8002-000000000001'),
  ('20000000-0000-4000-8002-000000000002', '10000000-0000-4000-8000-000000000002', '20000002', 'Supervisor', 'Activo', '30000000-0000-4000-8002-000000000002'),
  ('20000000-0000-4000-8002-000000000003', '10000000-0000-4000-8000-000000000002', '20000003', 'Reponedor', 'Activo', '30000000-0000-4000-8002-000000000003'),
  ('20000000-0000-4000-8002-000000000004', '10000000-0000-4000-8000-000000000002', '20000004', 'Reponedor Externo', 'Activo', '30000000-0000-4000-8002-000000000004');

insert into public.cadena (id, nombre)
values ('40000000-0000-4000-8000-000000000001', 'Cadena Integracion');

insert into public.subcadena (id, cadena_id, nombre)
values (
  '41000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'Subcadena Integracion'
);

insert into public.local
  (id, subcadena_id, codigo_local, nombre_local, estado)
values (
  '50000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  'LOCAL-I-001',
  'Local Integracion',
  'Abierto'
);

insert into public.proveedor (id, nombre)
values ('42000000-0000-4000-8000-000000000001', 'Proveedor Integracion');

insert into public.marca (id, proveedor_id, nombre)
values (
  '43000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001',
  'Marca Integracion'
);

insert into public.seccion (id, nombre)
values ('44000000-0000-4000-8000-000000000001', 'Seccion Integracion');

insert into public.articulo
  (id, ean_unidad, ean_pack, unidades_por_caja)
values
  ('60000000-0000-4000-8000-000000000001', '7800000000001', '17800000000008', 12),
  ('60000000-0000-4000-8000-000000000002', '7800000000002', '17800000000015', 12),
  ('60000000-0000-4000-8000-000000000003', '7800000000003', '17800000000022', 12);

insert into public.producto_cadena
  (id, cadena_id, sap, articulo_id, marca_texto_cadena, nombre_texto_cadena)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'SAP-INTEGRACION-A',
    '60000000-0000-4000-8000-000000000001',
    'Marca Integracion',
    'Producto Integracion Tenant A'
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000001',
    'SAP-INTEGRACION-B',
    '60000000-0000-4000-8000-000000000001',
    'Marca Integracion',
    'Producto Integracion Tenant B'
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000001',
    'SAP-EXCLUSIVO-A',
    '60000000-0000-4000-8000-000000000002',
    'Marca Integracion',
    'Producto Exclusivo Tenant A'
  ),
  (
    '70000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000001',
    'SAP-EXCLUSIVO-B',
    '60000000-0000-4000-8000-000000000003',
    'Marca Integracion',
    'Producto Exclusivo Tenant B'
  );

insert into public.producto_homologado
  (id, empresa_cliente_id, marca_id, seccion_id, nombre_homologado, caracteres)
values
  ('81000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', 'Homologado Tenant A', 10),
  ('81000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '43000000-0000-4000-8000-000000000001', '44000000-0000-4000-8000-000000000001', 'Homologado Tenant B', 10);

insert into public.producto_cliente
  (id, empresa_cliente_id, producto_cadena_id, producto_homologado_id, precio, estado)
values
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 1000, 'Activo'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000002', 2000, 'Activo'),
  ('80000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000001', 1100, 'Activo'),
  ('80000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000000002', 2100, 'Activo');

insert into public.stock_snapshot
  (id, empresa_cliente_id, local_id, producto_cliente_id, fecha, stock)
values
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', date '2026-01-01', 10),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', date '2026-01-01', 20);

insert into public.usuario_local_asignacion (usuario_id, local_id, lunes)
select id, '50000000-0000-4000-8000-000000000001', true
from public.usuario;

-- Privileges are deliberately not changed here. The pre-012 baseline supplies its inherited
-- broad grants, while migration 012 must revoke them and establish the production contract.
-- Keeping fixtures privilege-neutral prevents tests from masking a missing or excessive grant.
