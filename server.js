const express = require("express");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3002;

app.set("trust proxy", 1);

app.use(session({
  secret: process.env.SESSION_SECRET || "OfilabFirmas2026SesionSegura",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use(express.json({ limit: "15mb" }));

const PUBLIC_DIR = path.join(__dirname, "public");

const MAPA_PATH = path.join(
  PUBLIC_DIR,
  "data",
  "mapa_firmas.csv"
);

const FIRMAS_DIR = path.join(
  PUBLIC_DIR,
  "firmas"
);

app.use(express.static(PUBLIC_DIR));
// =========================================================
// LEER TODOS LOS USUARIOS DEL CSV
// =========================================================

function leerUsuarios() {

  return new Promise((resolve, reject) => {

    const resultados = [];

    fs.createReadStream(MAPA_PATH)

      .pipe(
        csv({
          mapHeaders: ({ header }) =>
            header
              .replace(/^\uFEFF/, "")
              .trim()
        })
      )

      .on("data", row => {

        resultados.push({
          correo_empleado:
            String(
              row.correo_empleado || ""
            ).trim(),

          nombre_corto:
            String(
              row.nombre_corto || ""
            ).trim()
        });

      })

      .on("end", () => {

        resolve(resultados);

      })

      .on("error", error => {

        reject(error);

      });

  });

}
function buscarFirma(email) {
  return new Promise((resolve, reject) => {
    const resultados = [];

    fs.createReadStream(MAPA_PATH)
      .pipe(csv({
    mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim()
}))
      .on("data", (row) => resultados.push(row))
      .on("end", () => {
        const encontrado = resultados.find(
          (x) =>
            x.correo_empleado &&
            x.correo_empleado.trim().toLowerCase() === email.trim().toLowerCase()
        );
        resolve(encontrado || null);
      })
      .on("error", reject);
  });
}



// =========================================================
// BANNER GLOBAL OFIMUNDO
// =========================================================

app.post("/api/banner", (req, res) => {

  try {

    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        error: "No se recibió imagen"
      });
    }

    const match = data.match(
      /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/
    );

    if (!match) {
      return res.status(400).json({
        error: "Formato de imagen no válido"
      });
    }

    const buffer =
      Buffer.from(match[2], "base64");

    const bannersDir =
      path.join(
        __dirname,
        "public",
        "banners"
      );

    fs.mkdirSync(
      bannersDir,
      { recursive: true }
    );

    const archivo =
      path.join(
        bannersDir,
        "banner-activo.png"
      );

    fs.writeFileSync(
      archivo,
      buffer
    );

    console.log(
      "Banner global actualizado:",
      new Date().toISOString()
    );

    res.json({
      ok: true,
      url:
        "/banners/banner-activo.png"
    });

  }

  catch (error) {

    console.error(error);

    res.status(500).json({
      error:
        "No se pudo actualizar el banner"
    });

  }

});


app.get("/api/signature", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({ error: "Falta parámetro email" });
    }

    const usuario = await buscarFirma(email);

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const nombreCorto = usuario.nombre_corto;

    if (!nombreCorto) {
      return res.status(500).json({ error: "Usuario sin nombre_corto" });
    }

    const archivoFirma = path.join(FIRMAS_DIR, `${nombreCorto}.html`);

    if (!fs.existsSync(archivoFirma)) {
      return res.status(404).json({
        error: `No existe firma para ${nombreCorto}`,
      });
    }

    const html = fs.readFileSync(archivoFirma, "utf8");

    return res.json({
      email,
      nombre_corto: nombreCorto,
      html,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Error interno",
      detalle: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    servicio: "firmas-ofimundo",
  });
});
// =========================================================
// LOGIN ADMINISTRADOR
// =========================================================

const ADMIN_USER =
  process.env.ADMIN_USER || "admin";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "Soporte0101";


app.post("/api/login", (req, res) => {

  const { usuario, password } = req.body;

  if (
    usuario === ADMIN_USER &&
    password === ADMIN_PASSWORD
  ) {

    req.session.autenticado = true;
    req.session.usuario = usuario;

    return res.json({
      ok: true,
      usuario
    });
  }

  return res.status(401).json({
    error: "Usuario o contraseña incorrectos"
  });
});


app.get("/api/session", (req, res) => {

  res.json({
    autenticado:
      req.session.autenticado === true,

    usuario:
      req.session.usuario || null
  });

});


app.post("/api/logout", (req, res) => {

  req.session.destroy(() => {

    res.json({
      ok: true
    });

  });

});


// =========================================================
// USUARIOS Y FIRMAS
// =========================================================

function normalizarEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function procesarDataUri(dataUri) {
  if (!dataUri) return null;

  const texto = String(dataUri).trim();

  const match = texto.match(
    /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i
  );

  if (!match) {
    throw new Error("Formato de imagen no válido");
  }

  const mime = match[1].toLowerCase();
  const base64 = match[2];

  let ext = "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
  if (mime.includes("webp")) ext = "webp";

  return {
    mime,
    ext,
    buffer: Buffer.from(base64, "base64")
  };
}
function cargarConfig() {

  const CONFIG_PATH =
    path.join(
      __dirname,
      "public",
      "data",
      "banner-config.json"
    );

  const configInicial = {
    globalBanner:
      "/banners/banner-activo.png",

    userBanners: {}
  };


  if (!fs.existsSync(CONFIG_PATH)) {

    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        configInicial,
        null,
        2
      ),
      "utf8"
    );

    return configInicial;
  }


  try {

    const config =
      JSON.parse(
        fs.readFileSync(
          CONFIG_PATH,
          "utf8"
        )
      );

    config.globalBanner =
      config.globalBanner ||
      "/banners/banner-activo.png";

    config.userBanners =
      config.userBanners || {};

    return config;

  }
  catch(error) {

    console.error(
      "Error cargando configuración de banners:",
      error
    );

    return configInicial;
  }
}

// =========================================================
// OBTENER UN USUARIO PARA EDICIÓN
// =========================================================

function bannerParaUsuario(email) {

  const config = cargarConfig();

  const correo =
    normalizarEmail(email);

  const BASE_URL =
    "https://firmas.ofimundo.cl";


  if (
    config.userBanners &&
    config.userBanners[correo]
  ) {

    const url =
      config.userBanners[correo];

    return {
      modo: "personalizado",

      url:
        url.startsWith("http://") ||
        url.startsWith("https://")
          ? url
          : BASE_URL + url
    };

  }


  const globalBanner =
    config.globalBanner ||
    "/banners/banner-activo.png";


  return {

    modo: "global",

    url:
      globalBanner.startsWith("http://") ||
      globalBanner.startsWith("https://")
        ? globalBanner
        : BASE_URL + globalBanner

  };

}
function decodificarHtml(texto) {

  if (!texto)
    return "";

  return String(texto)
    .replace(/&#225;/g, "á")
    .replace(/&#233;/g, "é")
    .replace(/&#237;/g, "í")
    .replace(/&#243;/g, "ó")
    .replace(/&#250;/g, "ú")
    .replace(/&#193;/g, "Á")
    .replace(/&#201;/g, "É")
    .replace(/&#205;/g, "Í")
    .replace(/&#211;/g, "Ó")
    .replace(/&#218;/g, "Ú")
    .replace(/&#241;/g, "ñ")
    .replace(/&#209;/g, "Ñ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
app.get("/api/usuario", async (req, res) => {

  try {

    if (!req.session.autenticado) {
      return res.status(401).json({
        error: "No autorizado"
      });
    }

    const email =
      normalizarEmail(req.query.email);

    if (!email) {
      return res.status(400).json({
        error: "Falta correo"
      });
    }

    const encontrado =
      await buscarFirma(email);

    if (!encontrado) {
      return res.status(404).json({
        error: "Usuario no encontrado"
      });
    }

    const nombreCorto =
      String(
        encontrado.nombre_corto || ""
      ).trim();

    const archivo =
      path.join(
        FIRMAS_DIR,
        nombreCorto + ".html"
      );

    if (!fs.existsSync(archivo)) {
      return res.status(404).json({
        error: "Firma no encontrada"
      });
    }

    const html =
      fs.readFileSync(
        archivo,
        "utf8"
      );

    const nombreMatch =
      html.match(
        /font-weight:\s*bold;\s*font-size:\s*18px[^>]*>(.*?)<\/p>/i
      );

    const cargoMatch =
      html.match(
        /font-size:\s*16px;\s*color:#555555[^>]*>(.*?)<\/p>/i
      );

    const telefonoMatch =
      html.match(
        /href=["']tel:([^"']+)/i
      );

    const fotoMatch =
      html.match(
        /02-foto_perfil\/([^"']+)/i
      );

    const qrSocialMatch =
      html.match(
        /03-qr_social\/([^"']+)/i
      );

    const qrLinkedinMatch =
      html.match(
        /04-qr_linkedin\/([^"']+)/i
      );

    const banner =
      bannerParaUsuario(email);

    res.json({

      correo: email,

      nombre_corto:
        nombreCorto,

      nombre:
  nombreMatch
    ? decodificarHtml(
        nombreMatch[1]
          .replace(/<[^>]+>/g, "")
      )
    : "",

      cargo:
  cargoMatch
    ? decodificarHtml(
        cargoMatch[1]
          .replace(/<[^>]+>/g, "")
      )
    : "",

      celular:
        telefonoMatch
          ? telefonoMatch[1]
          : "",

      foto:
        fotoMatch
          ? "https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/02-foto_perfil/" +
            fotoMatch[1]
          : "",

      qrSocial:
        qrSocialMatch
          ? "https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/03-qr_social/" +
            qrSocialMatch[1]
          : "",

      qrLinkedin:
        qrLinkedinMatch
          ? "https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/04-qr_linkedin/" +
            qrLinkedinMatch[1]
          : "",

      bannerModo:
        banner.modo,

      bannerUrl:
        banner.url

    });

  }

  catch(error) {

    console.error(error);

    res.status(500).json({
      error:
        "No se pudo cargar el usuario"
    });
  }

});
// =========================================================
// GUARDAR / PUBLICAR USUARIO
// =========================================================

app.post("/api/usuario", async (req, res) => {

  try {

    if (!req.session.autenticado) {
      return res.status(401).json({
        error: "No autorizado"
      });
    }

    const {
      nombre,
      cargo,
      correo,
      celular,
      foto,
      qrSocial,
      qrLinkedin
    } = req.body;

    const email =
      normalizarEmail(correo);

    if (!email) {
      return res.status(400).json({
        error: "Debes indicar el correo"
      });
    }

    if (!nombre) {
      return res.status(400).json({
        error: "Debes indicar el nombre"
      });
    }

   let nombreCortoGenerado =
  nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

let nombreCorto = nombreCortoGenerado;

try {
  const usuariosActuales = await leerUsuarios();

  const existente = usuariosActuales.find(
    u => normalizarEmail(u.correo_empleado) === email
  );

  if (existente && existente.nombre_corto) {
    nombreCorto = existente.nombre_corto;
  }

} catch (error) {
  console.error(
    "No se pudo comprobar nombre_corto existente:",
    error
  );
}

    const marker =
      "OFIMUNDO_SIG_" +
      email
        .replace(/[^a-z0-9]/g, "_");


    // =====================================================
    // GUARDAR FOTO / QR
    // =====================================================

    const uploadsDir =
      path.join(
        PUBLIC_DIR,
        "uploads",
        nombreCorto
      );

    fs.mkdirSync(
      uploadsDir,
      { recursive: true }
    );


    function guardarImagenBase64(data, tipo) {

      if (!data)
        return null;

      const imagen =
        procesarDataUri(data);

      const nombreArchivo =
  tipo + "." +
  imagen.ext;

      const destino =
        path.join(
          uploadsDir,
          nombreArchivo
        );

      fs.writeFileSync(
        destino,
        imagen.buffer
      );

     return (
  "https://firmas.ofimundo.cl/uploads/" +
  nombreCorto +
  "/" +
  nombreArchivo
);
}

    const fotoUrl =
      guardarImagenBase64(
        foto,
        "foto"
      );

    const qrSocialUrl =
      guardarImagenBase64(
        qrSocial,
        "qr-social"
      );

    const qrLinkedinUrl =
      guardarImagenBase64(
        qrLinkedin,
        "qr-linkedin"
      );


    // =====================================================
    // SI YA EXISTE, CONSERVAR IMÁGENES EXISTENTES
    // =====================================================

    let usuarioExistente = null;

    try {
      usuarioExistente =
        await buscarFirma(email);
    }
    catch {}


    let fotoFinal =
      fotoUrl ||
      (
        usuarioExistente
        ? `https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/02-foto_perfil/${nombreCorto}.png`
        : "/assets/icon-80.png"
      );


    let qrSocialFinal =
      qrSocialUrl ||
      (
        usuarioExistente
        ? `https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/03-qr_social/${nombreCorto}.png`
        : ""
      );


    let qrLinkedinFinal =
      qrLinkedinUrl ||
      (
        usuarioExistente
        ? `https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/04-qr_linkedin/${nombreCorto}.png`
        : ""
      );


    // =====================================================
    // HTML REAL
    // =====================================================

    const banner =
      bannerParaUsuario(email);

    const bannerUrl =
      banner.url;


    const html = `
<html>
<head>
<meta charset="UTF-8">
</head>

<table
width="630"
cellpadding="0"
cellspacing="0"
border="0"
style="
font-family:Arial,Verdana,sans-serif;
color:#333333;
background-color:#ffffff;
">

<tr>
<td colspan="3" style="padding:0;text-align:right;">

<img
src="https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/01-elementos/elemento-superior.png"
width="300"
height="35"
style="display:block;margin-left:auto;">

</td>
</tr>


<tr>
<td colspan="3"
style="padding:5px 0 0 0;text-align:right;">

<img
src="https://d3d57fbyf4vdnc.cloudfront.net/firma_ofimundo/01-elementos/elemento-barra.png"
width="300"
height="7"
style="display:block;margin-left:auto;">

</td>
</tr>


<tr>

<td
width="170"
valign="middle"
align="left">

<img
src="${fotoFinal}"
width="155"
height="155"
style="
border-radius:50%;
display:block;
object-fit:cover;
">

</td>


<td
width="230"
valign="middle"
align="left"
style="padding-left:20px;">

<p
style="
margin:0;
font-weight:bold;
font-size:18px;
">
${nombre}
</p>

<p
style="
margin:2px 0 0 0;
font-size:16px;
color:#555555;
">
${cargo || ""}
</p>

${celular ? `
<p
style="
margin:2px 0 0 0;
font-size:16px;
color:#555555;
">

<a
href="tel:${String(celular).replace(/\s+/g,"")}"
style="
color:#1a0a4e;
text-decoration:none;
">
Tel:${celular}
</a>

</p>
` : ""}

</td>


<td
valign="middle"
align="right">

<table
cellpadding="0"
cellspacing="0"
border="0">

<tr>

<td
align="center"
style="padding:0 15px;">

${qrSocialFinal ? `
<img
src="${qrSocialFinal}"
width="110"
height="105"
style="display:block;">
` : ""}

</td>


<td
align="center"
style="padding:0;">

${qrLinkedinFinal ? `
<img
src="${qrLinkedinFinal}"
width="110"
height="105"
style="display:block;">
` : ""}

</td>

</tr>

</table>

</td>

</tr>


<tr>

<td
colspan="3"
align="center"
style="padding:0;">

<img
src="${bannerUrl}"
alt="Barra inferior"
width="630"
style="
display:block;
margin-top:8px;
">

</td>

</tr>

</table>

<span
style="
display:none;
font-size:0;
line-height:0;
color:#ffffff;
">
${marker}
</span>

</html>
`;


    const firmaPath =
      path.join(
        FIRMAS_DIR,
        nombreCorto + ".html"
      );

    fs.writeFileSync(
      firmaPath,
      html,
      "utf8"
    );


    // =====================================================
    // ACTUALIZAR MAPA CSV
    // =====================================================

    const usuarios =
      await leerUsuarios();

    const existe =
      usuarios.find(
        x =>
          normalizarEmail(
            x.correo_empleado
          ) === email
      );


    if (!existe) {

      const linea =
        `\n"${email}","${nombreCorto}"`;

      fs.appendFileSync(
        MAPA_PATH,
        linea,
        "utf8"
      );

    }


    res.json({
      ok: true,
      mensaje:
        usuarioExistente
        ? "Usuario actualizado correctamente"
        : "Usuario creado correctamente",

      email,

      nombre_corto:
        nombreCorto,

      firma:
        `/api/signature?email=${encodeURIComponent(email)}`
    });

  }

  catch(error) {

    console.error(error);

    res.status(500).json({
      error:
        error.message ||
        "No se pudo guardar el usuario"
    });
  }

});
// =========================================================
// LISTADO DE USUARIOS
// =========================================================

app.get("/api/usuarios", async (req, res) => {

  try {

    if (!req.session.autenticado) {
      return res.status(401).json({
        error: "No autorizado"
      });
    }

    const usuarios = await leerUsuarios();
    const config = cargarConfig();

    const resultado = usuarios.map(u => {

      const correo =
        normalizarEmail(
          u.correo_empleado
        );

      const nombreCorto =
        String(
          u.nombre_corto || ""
        ).trim();

      const archivoFirma =
        path.join(
          FIRMAS_DIR,
          nombreCorto + ".html"
        );

      const firmaExiste =
        fs.existsSync(
          archivoFirma
        );

      const bannerPersonalizado =
        config.userBanners &&
        config.userBanners[correo];

      return {

        correo,

        nombre_corto:
          nombreCorto,

        firmaExiste,

        banner:
          bannerPersonalizado
            ? "Personalizado"
            : "Global",

        firmaUrl:
          "/api/signature?email=" +
          encodeURIComponent(correo)

      };

    });


    return res.json({

      total:
        resultado.length,

      usuarios:
        resultado

    });

  }

  catch(error) {

    console.error(
      "Error /api/usuarios:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudieron obtener los usuarios"
    });

  }

});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Firmas Ofimundo escuchando en puerto ${PORT}`);
});
