# Programa Registro de Ventas para Playground

Copia adaptada del programa `registro` de [WayLearn](https://github.com/WayLearnLatam/Registro-Ventas-Solana-PDA), con Registro, Cliente y Venta, validación de montos y baja de clientes sin ventas activas.

- `src/lib.rs`: programa desplegado en Devnet.
- `client/client.ts`: cliente para Solana Playground, con las seis operaciones.
- `tests/anchor.test.ts`: nueve pruebas de integración del programa.

Esta carpeta no es un workspace Anchor CLI completo. Se encuentra preparada para [Solana Playground](https://beta.solpg.io/). El Program ID del despliegue es `Dg1cxWyD4NG4tAzSF3UVWErYtQBni4US66byhbJ8Coer`. Las pruebas se ejecutan con el botón Test en Playground conectado a Devnet.

El IDL correspondiente se incluye en la raíz del repositorio. Consulta [la guía de IDL y Playground](../docs/IDL-Y-PLAYGROUND.md) para regenerar el cliente si cambias el programa. No subas archivos de claves privadas.
