// Ejecutar en Solana Playground conectado exclusivamente a Devnet.
describe("Registro de Ventas", function () {
  this.timeout(120000);
  const owner = pg.wallet.publicKey;
  const nombre = "Tienda-" + Date.now();
  const sku = "A001";
  const opciones = { commitment: "confirmed", preflightCommitment: "confirmed" } as const;
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(1, 0);

  const [registro] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("registro"), Buffer.from(nombre), owner.toBuffer()], pg.PROGRAM_ID
  );
  const [cliente] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("cliente"), registro.toBuffer(), bytes], pg.PROGRAM_ID
  );
  const [venta] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("venta"), cliente.toBuffer(), Buffer.from(sku)], pg.PROGRAM_ID
  );

  async function esperar(lectura, condicion) {
    for (let intento = 0; intento < 15; intento++) {
      try {
        const datos = await lectura();
        if (condicion(datos)) return datos;
      } catch (error) {
        // Reintentar solo la lectura, nunca la transacción.
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Devnet no confirmó el estado esperado");
  }

  async function validarError(operacion, codigo) {
    try {
      await operacion();
    } catch (error) {
      const esperado = error?.error?.errorCode?.code === codigo || String(error).includes(codigo);
      assert(esperado);
      return;
    }
    throw new Error("No ocurrió el error esperado: " + codigo);
  }

  it("Crear registro", async () => {
    await pg.program.methods.crearRegistro(nombre).accounts({ owner, registro }).rpc(opciones);
    const datos = await esperar(() => pg.program.account.registro.fetch(registro, "confirmed"), (datos) => datos.nombreNegocio === nombre);
    assert(datos.nombreNegocio === nombre);
    assert(datos.idCounter === 0);
  });

  it("Crear cliente", async () => {
    await pg.program.methods.crearCliente("Cliente Demo").accounts({ owner, registro, cliente }).rpc(opciones);
    const datos = await esperar(() => pg.program.account.cliente.fetch(cliente, "confirmed"), (datos) => datos.idCliente === 1);
    assert(datos.idCliente === 1);
    assert(datos.compras === 0);
  });

  it("Rechazar venta con monto cero", async () => {
    await validarError(() => pg.program.methods.registrarVenta(1, sku, "Producto Demo", 0).accounts({ owner, registro, cliente, venta }).rpc(opciones), "MontoInvalido");
  });

  it("Registrar venta", async () => {
    await pg.program.methods.registrarVenta(1, sku, "Producto Demo", 100).accounts({ owner, registro, cliente, venta }).rpc(opciones);
    const datos = await esperar(() => pg.program.account.venta.fetch(venta, "confirmed"), (datos) => datos.monto === 100);
    assert(datos.monto === 100);
  });

  it("Rechazar cambio de monto a cero", async () => {
    await validarError(() => pg.program.methods.cambiarMonto(1, sku, 0).accounts({ owner, registro, cliente, venta }).rpc(opciones), "MontoInvalido");
    const datos = await pg.program.account.venta.fetch(venta, "confirmed");
    assert(datos.monto === 100);
  });

  it("Cambiar monto", async () => {
    await pg.program.methods.cambiarMonto(1, sku, 150).accounts({ owner, registro, cliente, venta }).rpc(opciones);
    const datos = await esperar(() => pg.program.account.venta.fetch(venta, "confirmed"), (datos) => datos.monto === 150);
    assert(datos.monto === 150);
  });

  it("Impedir eliminar cliente con ventas activas", async () => {
    await validarError(() => pg.program.methods.eliminarCliente(1).accounts({ owner, registro, cliente }).rpc(opciones), "VentasActivas");
  });

  it("Hacer devolución", async () => {
    await pg.program.methods.hacerDevolucion(1, sku).accounts({ owner, registro, cliente, venta }).rpc(opciones);
    const datos = await esperar(() => pg.program.account.cliente.fetch(cliente, "confirmed"), (datos) => datos.compras === 0 && datos.historial.length === 0);
    assert(datos.compras === 0);
    assert(datos.historial.length === 0);
    await esperar(() => pg.connection.getAccountInfo(venta, "confirmed"), (cuenta) => cuenta === null);
  });

  it("Eliminar cliente", async () => {
    await pg.program.methods.eliminarCliente(1).accounts({ owner, registro, cliente }).rpc(opciones);
    const datos = await esperar(() => pg.program.account.registro.fetch(registro, "confirmed"), (datos) => datos.clientes.length === 0);
    assert(datos.clientes.length === 0);
    assert(datos.idCounter === 1);
    const cuenta = await esperar(() => pg.connection.getAccountInfo(cliente, "confirmed"), (cuenta) => cuenta === null);
    assert(cuenta === null);
  });
});
