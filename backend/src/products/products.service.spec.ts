import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { ProductsService } from './products.service';

const actor: AuthUser = {
  id: 'admin-id',
  tenantId: 'tenant-id',
  role: 'Administrador',
  name: 'Admin',
  authUserId: 'admin-auth-id',
};

const productForUpdateRow = {
  id: 'product-1',
  producto_cadena_id: 'pc-1',
  producto_homologado_id: 'ph-1',
  precio: '1000',
  precio_pack: null,
  estado: 'Activo',
  campana_activa: false,
  campana_desde: null,
  campana_hasta: null,
  quiebre_activo: false,
  quiebre_declarado_en: null,
  cadena_id: 'cadena-1',
  sap: 'SAP1',
  sap_pack: null,
  articulo_id: 'articulo-1',
  nombre_texto_cadena: 'Producto Cadena',
  marca_texto_cadena: 'Marca Cadena',
  ean_unidad: '77123456',
  ean_pack: null,
  unidades_por_caja: '12',
  nombre_homologado: 'Producto Homologado',
  marca_id: 'marca-1',
  seccion_id: 'seccion-1',
};

const productDetailRow = {
  id: 'product-1',
  cadena_id: 'cadena-1',
  cadena_nombre: 'CENCOSUD',
  sap: 'SAP1',
  sap_pack: null,
  nombre_texto_cadena: 'Producto Cadena',
  marca_texto_cadena: 'Marca Cadena',
  ean_unidad: '77123456',
  ean_pack: null,
  unidades_por_caja: '12',
  nombre_homologado: 'Producto Homologado',
  marca_nombre: 'Marca',
  seccion_id: 'seccion-1',
  seccion_nombre: 'Sección',
  precio: '1000',
  precio_pack: null,
  estado: 'Activo',
  campana_activa: false,
  campana_desde: null,
  campana_hasta: null,
  quiebre_activo: false,
  quiebre_declarado_en: null,
};

function makeClient(rules: Array<[string, unknown[]]>) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const query = jest.fn((text: string, values: unknown[] = []) => {
    calls.push({ text, values });
    const rule = rules.find(([pattern]) => text.includes(pattern));
    return Promise.resolve(rule ? rule[1] : []);
  });
  return { query, calls };
}

function makeDatabase(client: ReturnType<typeof makeClient>) {
  return {
    query: client.query,
    transaction: jest.fn((fn: (c: typeof client) => unknown) => fn(client)),
  };
}

function makeAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) };
}

const DETAIL_RULES: Array<[string, unknown[]]> = [
  ['select pcl.id, c.id as cadena_id', [productDetailRow]],
  ['select tipo, referencia_archivo, url', []],
];

describe('ProductsService.create', () => {
  it('rechaza campaña activa sin fecha de inicio antes de tocar la base', async () => {
    const client = makeClient([]);
    const service = new ProductsService(
      makeDatabase(client) as never,
      makeAudit(),
    );
    await expect(
      service.create(actor, {
        cadenaId: 'cadena-1',
        sap: 'SAP1',
        nombreHomologado: 'Producto',
        campanaActiva: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('rechaza cadena+SAP duplicado en la misma empresa', async () => {
    const client = makeClient([
      ['select id from public.producto_cadena', [{ id: 'pc-1' }]],
      [
        'select id from public.producto_cliente where empresa_cliente_id = $1 and producto_cadena_id = $2',
        [{ id: 'existing' }],
      ],
    ]);
    const service = new ProductsService(
      makeDatabase(client) as never,
      makeAudit(),
    );
    await expect(
      service.create(actor, {
        cadenaId: 'cadena-1',
        sap: 'SAP1',
        nombreHomologado: 'Producto',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('crea el producto y registra auditoría', async () => {
    const client = makeClient([
      ['select id from public.producto_cadena', []],
      ['insert into public.producto_cadena', [{ id: 'pc-1' }]],
      [
        'select id from public.producto_cliente where empresa_cliente_id = $1 and producto_cadena_id = $2',
        [],
      ],
      ['select id, nombre_homologado from public.producto_homologado', []],
      ['insert into public.producto_homologado', [{ id: 'ph-1' }]],
      ['insert into public.producto_cliente', [{ id: 'product-1' }]],
      ...DETAIL_RULES,
    ]);
    const audit = makeAudit();
    const service = new ProductsService(makeDatabase(client) as never, audit);

    const result = await service.create(actor, {
      cadenaId: 'cadena-1',
      sap: 'SAP1',
      nombreHomologado: 'Producto Homologado',
    });

    expect(result.id).toBe('product-1');
    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({ accion: 'producto.creado' }),
    );
  });
});

describe('ProductsService.update', () => {
  it('lanza NotFoundException si el producto no pertenece a la empresa', async () => {
    const client = makeClient([]);
    const service = new ProductsService(
      makeDatabase(client) as never,
      makeAudit(),
    );
    await expect(
      service.update(actor, 'missing', { precio: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('al cambiar cadena o SAP, detecta conflicto con otro producto existente', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      ['select id from public.producto_cadena', [{ id: 'pc-2' }]],
      [
        'select id from public.producto_cliente\n         where empresa_cliente_id = $1 and producto_cadena_id = $2 and id <> $3',
        [{ id: 'otro-producto' }],
      ],
    ]);
    const service = new ProductsService(
      makeDatabase(client) as never,
      makeAudit(),
    );
    await expect(
      service.update(actor, 'product-1', { sap: 'SAP-NUEVO' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('bloquea la edición de identidad compartida con otra empresa', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      ['select exists (', [{ compartido: true }]],
    ]);
    const service = new ProductsService(
      makeDatabase(client) as never,
      makeAudit(),
    );

    await expect(
      service.update(actor, 'product-1', { nombreCadena: 'Nuevo nombre' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      client.calls.some(
        (call) =>
          call.text.includes('update public.producto_cadena') ||
          call.text.includes('update public.articulo'),
      ),
    ).toBe(false);
  });

  it('actualiza precio sin tocar identidad ni homologación', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      ...DETAIL_RULES,
    ]);
    const audit = makeAudit();
    const service = new ProductsService(makeDatabase(client) as never, audit);

    await service.update(actor, 'product-1', { precio: 1500 });

    expect(
      client.calls.some((c) =>
        c.text.includes('update public.producto_cliente set precio'),
      ),
    ).toBe(true);
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('ProductsService.setStatus', () => {
  it('audita activación y desactivación', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      ...DETAIL_RULES,
    ]);
    const audit = makeAudit();
    const service = new ProductsService(makeDatabase(client) as never, audit);

    await service.setStatus(actor, 'product-1', 'Bloqueado');

    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({ accion: 'producto.desactivado' }),
    );
  });

  it('no hace nada ni audita si el estado no cambia', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      ...DETAIL_RULES,
    ]);
    const audit = makeAudit();
    const service = new ProductsService(makeDatabase(client) as never, audit);

    await service.setStatus(actor, 'product-1', 'Activo');

    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('ProductsService.setQuiebre', () => {
  it('declara quiebre individual y registra motivo y no-propagación en la auditoría', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      ...DETAIL_RULES,
    ]);
    const audit = makeAudit();
    const service = new ProductsService(makeDatabase(client) as never, audit);

    await service.setQuiebre(actor, 'product-1', {
      quiebreActivo: true,
      motivo: 'Sin stock',
    });

    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({
        accion: 'producto.quiebre_activado',
        metadata: expect.objectContaining({
          motivo: 'Sin stock',
          propagado: false,
        }) as Record<string, unknown>,
      }),
    );
  });

  it('rechaza propagar por EAN cuando el artículo no tiene EAN válido', async () => {
    const sinEan = { ...productForUpdateRow, ean_unidad: '123' };
    const client = makeClient([['for update of pcl', [sinEan]]]);
    const service = new ProductsService(
      makeDatabase(client) as never,
      makeAudit(),
    );

    await expect(
      service.setQuiebre(actor, 'product-1', {
        quiebreActivo: true,
        propagarPorEan: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propaga el quiebre a todos los productos con el mismo EAN de la empresa', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      [
        'join public.articulo a on a.id = pc.articulo_id',
        [
          { id: 'product-1', quiebre_activo: false },
          { id: 'product-2', quiebre_activo: false },
        ],
      ],
      ...DETAIL_RULES,
    ]);
    const audit = makeAudit();
    const service = new ProductsService(makeDatabase(client) as never, audit);

    await service.setQuiebre(actor, 'product-1', {
      quiebreActivo: true,
      propagarPorEan: true,
    });

    expect(audit.record).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({
        entidadId: 'product-2',
        metadata: expect.objectContaining({
          propagado: true,
          eanUtilizado: '77123456',
        }) as Record<string, unknown>,
      }),
    );
  });
});

describe('ProductsService.clone', () => {
  it('rechaza clonar con el mismo SAP y la misma cadena', async () => {
    const client = makeClient([['for update of pcl', [productForUpdateRow]]]);
    const service = new ProductsService(
      makeDatabase(client) as never,
      makeAudit(),
    );

    await expect(
      service.clone(actor, 'product-1', { sap: 'SAP1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clona con un SAP nuevo sin copiar EAN ni campaña por defecto', async () => {
    const client = makeClient([
      ['for update of pcl', [productForUpdateRow]],
      ['insert into public.articulo', [{ id: 'articulo-clon' }]],
      ['select id from public.producto_cadena', []],
      ['insert into public.producto_cadena', [{ id: 'pc-clon' }]],
      [
        'select id from public.producto_cliente where empresa_cliente_id = $1 and producto_cadena_id = $2',
        [],
      ],
      ['insert into public.producto_cliente', [{ id: 'product-clon' }]],
      ...DETAIL_RULES,
    ]);
    const audit = makeAudit();
    const service = new ProductsService(makeDatabase(client) as never, audit);

    const result = await service.clone(actor, 'product-1', { sap: 'SAP-CLON' });

    expect(result.id).toBe('product-1');
    expect(audit.record).toHaveBeenCalledWith(
      client,
      actor,
      expect.objectContaining({ accion: 'producto.clonado' }),
    );
    expect(
      client.calls.some((c) => c.text.includes('insert into public.articulo')),
    ).toBe(true);
    expect(
      client.calls.some((c) =>
        c.text.includes('insert into public.producto_imagen'),
      ),
    ).toBe(false);
  });
});
