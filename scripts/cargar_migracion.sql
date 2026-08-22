\set ON_ERROR_STOP on
begin;

\copy public.empresa_cliente (id,rut_empresa,nombre_comercial,estado,codigo_acceso,referencia_base_origen) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/empresa_cliente.csv' with (format csv, header true, null '\N');
\copy public.carpeta_almacenamiento (id,empresa_cliente_id,tipo,referencia_carpeta) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/carpeta_almacenamiento.csv' with (format csv, header true, null '\N');
\copy public.cadena (id,nombre) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/cadena.csv' with (format csv, header true, null '\N');
\copy public.subcadena (id,cadena_id,nombre) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/subcadena.csv' with (format csv, header true, null '\N');
\copy public.local (id,subcadena_id,codigo_local,nombre_local,direccion,latitud,longitud,estado) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/local.csv' with (format csv, header true, null '\N');
\copy public.proveedor (id,nombre) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/proveedor.csv' with (format csv, header true, null '\N');
\copy public.marca (id,proveedor_id,nombre) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/marca.csv' with (format csv, header true, null '\N');
\copy public.seccion (id,nombre) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/seccion.csv' with (format csv, header true, null '\N');
\copy public.articulo (id,ean_unidad,ean_pack,unidades_por_caja) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/articulo.csv' with (format csv, header true, null '\N');
\copy public.producto_cadena (id,cadena_id,sap,articulo_id,marca_texto_cadena,nombre_texto_cadena,llave_sap_origen) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/producto_cadena.csv' with (format csv, header true, null '\N');
\copy public.producto_homologado (id,empresa_cliente_id,marca_id,seccion_id,nombre_homologado,caracteres) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/producto_homologado.csv' with (format csv, header true, null '\N');
\copy public.producto_cliente (id,empresa_cliente_id,producto_cadena_id,producto_homologado_id,precio,estado) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/producto_cliente.csv' with (format csv, header true, null '\N');
\copy public.producto_imagen (id,empresa_cliente_id,producto_cliente_id,tipo,referencia_archivo,url) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/producto_imagen.csv' with (format csv, header true, null '\N');
\copy public.persona (rut,nombre,telefono) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/persona.csv' with (format csv, header true, null '\N');
\copy public.usuario (id,empresa_cliente_id,persona_rut,perfil,estado,auth_user_id) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/usuario.csv' with (format csv, header true, null '\N');
\copy public.usuario_local_asignacion (id,usuario_id,local_id,lunes,martes,miercoles,jueves,viernes,sabado,domingo) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/usuario_local_asignacion.csv' with (format csv, header true, null '\N');
\copy public.stock_snapshot (id,empresa_cliente_id,local_id,producto_cliente_id,fecha,stock,datos_origen) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/stock_snapshot.csv' with (format csv, header true, null '\N');
\copy public.stock_historial (id,empresa_cliente_id,local_id,producto_cliente_id,fecha,stock,datos_origen) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/stock_historial.csv' with (format csv, header true, null '\N');
\copy public.inventario_registro (id,empresa_cliente_id,usuario_id,local_id,producto_cliente_id,fecha,tipo_ingreso,unidades,cajas,nombre_usuario_origen,perfil_origen,datos_origen) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/inventario_registro.csv' with (format csv, header true, null '\N');
\copy public.foto_terreno (id,empresa_cliente_id,usuario_id,local_id,producto_cliente_id,fecha,stock_al_momento,fecha_stock_sistemico,foto_referencia,foto_url,nombre_usuario_origen,perfil_origen,datos_origen) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/foto_terreno.csv' with (format csv, header true, null '\N');
\copy public.registro_acceso (id,empresa_cliente_id,usuario_id,fecha,rol_en_el_momento,nombre_usuario_origen,datos_origen) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/registro_acceso.csv' with (format csv, header true, null '\N');
\copy public.registro_error (id,fecha,mensaje_error,contexto_funcion) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/registro_error.csv' with (format csv, header true, null '\N');

\copy migracion_auditoria.lote (id,nombre,archivo_origen,hash_archivo_sha256,estado,total_filas,filas_exitosas,filas_con_error,observaciones) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/migracion_lote.csv' with (format csv, header true, null '\N');
\copy migracion_auditoria.registro (lote_id,hoja_origen,fila_origen,hash_fila_sha256,tabla_destino,registro_destino_id,estado,mensaje) from '/home/agente-de-fer/Escritorio/proyectos/software retail/migracion-preparada/migracion_registro.csv' with (format csv, header true, null '\N');

update migracion_auditoria.registro set estado = 'cargado' where estado = 'pendiente';
update migracion_auditoria.lote l
set estado = 'completado',
    finalizado_en = now(),
    filas_exitosas = (select count(*) from migracion_auditoria.registro r where r.lote_id = l.id and r.estado = 'cargado'),
    filas_con_error = (select count(*) from migracion_auditoria.registro r where r.lote_id = l.id and r.estado = 'error');

commit;
