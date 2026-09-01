(async function validarSesion() {

    try {

        const r =
            await fetch("/api/session");

        const data =
            await r.json();

        if (!data.autenticado) {

            window.location =
                "/generador/login.html";

            return;
        }

    }

    catch {

        window.location =
            "/generador/login.html";
    }

})();
const $ = id => document.getElementById(id);

const nombre = $("nombre");
const cargo = $("cargo");
const correo = $("correo");
const celular = $("celular");

function actualizarDatos() {
    $("previewNombre").textContent =
        nombre.value || "Nombre Apellido";

    $("previewCargo").textContent =
        cargo.value || "Cargo";

    $("previewCelular").textContent =
        celular.value || "";
}

[nombre,cargo,correo,celular].forEach(el => {
    el.addEventListener("input", actualizarDatos);
});


function previewImagen(input, imagen) {

    input.addEventListener("change", () => {

        const archivo = input.files[0];

        if (!archivo) return;

        const reader = new FileReader();

        reader.onload = e => {
            imagen.src = e.target.result;
        };

        reader.readAsDataURL(archivo);

    });

}

previewImagen($("foto"), $("previewFoto"));
previewImagen($("qrSocial"), $("previewQrSocial"));
previewImagen($("qrLinkedin"), $("previewQrLinkedin"));


/* =========================================
   COPIAR FIRMA
========================================= */

$("copiar").addEventListener("click", async () => {

    try {

        const html =
            $("firmaPreview").innerHTML;

        const item =
            new ClipboardItem({
                "text/html":
                    new Blob(
                        [html],
                        {type:"text/html"}
                    )
            });

        await navigator.clipboard.write([item]);

        $("copiar").textContent =
            "Firma copiada ✓";

        setTimeout(() => {
            $("copiar").textContent =
                "Copiar firma";
        },2000);

    }
    catch(e) {

        alert(
            "No se pudo copiar la firma."
        );

    }

});


/* =========================================
   BANNER GLOBAL
========================================= */

$("subirBanner").addEventListener(
"click",
async () => {

    const archivo =
        $("archivoBanner").files[0];

    const estado =
        $("estadoBanner");

    if (!archivo) {

        estado.textContent =
            "Selecciona una imagen.";

        return;

    }


    const reader =
        new FileReader();


    reader.onload =
    async e => {

        estado.textContent =
            "Actualizando banner...";

        try {

            const r =
                await fetch(
                    "/api/banner",
                    {
                        method:"POST",

                        headers:{
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                filename:
                                    archivo.name,

                                data:
                                    e.target.result
                            })
                    }
                );


            const data =
                await r.json();


            if (!r.ok)
                throw new Error(
                    data.error
                );


            const nuevaUrl =
                "/banners/banner-activo.png?t="
                + Date.now();


            $("previewBanner").src =
                nuevaUrl;

            $("bannerAdministracion").src =
                nuevaUrl;


            estado.textContent =
                "✓ Banner global actualizado correctamente.";

        }

        catch(error) {

            estado.textContent =
                "Error: "
                + error.message;

        }

    };


    reader.readAsDataURL(
        archivo
    );

});


/* =========================================
   GUARDAR
   La API se agregará en el siguiente paso.
========================================= */
// =========================================================
// GUARDAR Y PUBLICAR USUARIO
// =========================================================

$("guardar").addEventListener(
"click",
async () => {

    const boton =
        $("guardar");

    const nombreValor =
        nombre.value.trim();

    const cargoValor =
        cargo.value.trim();

    const correoValor =
        correo.value.trim().toLowerCase();

    const celularValor =
        celular.value.trim();


    if (!nombreValor) {

        alert(
            "Debes ingresar el nombre."
        );

        return;
    }


    if (!correoValor) {

        alert(
            "Debes ingresar el correo."
        );

        return;
    }


    boton.disabled = true;
    boton.textContent =
        "Guardando...";


    try {

        async function archivoBase64(input) {

            const archivo =
                input.files[0];

            if (!archivo)
                return null;

            return await leerArchivoBase64(
                archivo
            );
        }


        const fotoBase64 =
            await archivoBase64(
                $("foto")
            );

        const qrSocialBase64 =
            await archivoBase64(
                $("qrSocial")
            );

        const qrLinkedinBase64 =
            await archivoBase64(
                $("qrLinkedin")
            );


        const respuesta =
            await fetch(
                "/api/usuario",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            nombre:
                                nombreValor,

                            cargo:
                                cargoValor,

                            correo:
                                correoValor,

                            celular:
                                celularValor,

                            foto:
                                fotoBase64,

                            qrSocial:
                                qrSocialBase64,

                            qrLinkedin:
                                qrLinkedinBase64

                        })
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                resultado.error ||
                "No se pudo guardar"
            );
        }


        alert(
            resultado.mensaje
        );


        // Refresca la firma real desde el backend
        const firmaResponse =
            await fetch(
                "/api/signature?email=" +
                encodeURIComponent(
                    correoValor
                )
            );


        if (firmaResponse.ok) {

            const firma =
                await firmaResponse.json();

            console.log(
                "Firma publicada:",
                firma
            );
        }


        boton.textContent =
            "Publicado ✓";


        setTimeout(() => {

            boton.textContent =
                "Guardar y publicar";

            boton.disabled = false;

        },2000);


    }

    catch(error) {

        console.error(error);

        alert(
            "Error: " +
            error.message
        );

        boton.textContent =
            "Guardar y publicar";

        boton.disabled = false;

    }

});

// =========================================================
// NAVEGACIÓN
// =========================================================

const workspace =
    document.querySelector(".workspace");

const bannerPanel =
    document.querySelector(".banner-panel");

const vistaUsuarios =
    $("vistaUsuarios");


function activarTab(boton) {

    document
        .querySelectorAll(".tab")
        .forEach(x =>
            x.classList.remove("active")
        );

    boton.classList.add("active");
}


function mostrarNuevoUsuario() {

    activarTab(
        $("btnNuevoUsuario")
    );

    workspace.style.display =
        "grid";

    vistaUsuarios.style.display =
        "none";

    bannerPanel.style.display =
        "none";


    nombre.value = "";
    cargo.value = "";
    correo.value = "";
    celular.value = "";

    $("linkedin").value = "";
    $("booking").value = "";


    $("previewNombre").textContent =
        "Nombre Apellido";

    $("previewCargo").textContent =
        "Cargo";

    $("previewCelular").textContent =
        "";


    $("previewFoto").src =
        "/assets/icon-80.png";


    $("previewQrSocial").removeAttribute(
        "src"
    );

    $("previewQrLinkedin").removeAttribute(
        "src"
    );

}


$("btnNuevoUsuario")
.addEventListener(
    "click",
    mostrarNuevoUsuario
);


$("nuevoDesdeUsuarios")
.addEventListener(
    "click",
    mostrarNuevoUsuario
);


// =========================================================
// LISTADO USUARIOS
// =========================================================

let usuariosSistema = [];


$("btnUsuarios")
.addEventListener(
"click",
async () => {

    activarTab(
        $("btnUsuarios")
    );

    workspace.style.display =
        "none";

    bannerPanel.style.display =
        "none";

    vistaUsuarios.style.display =
        "block";

    await cargarUsuarios();

});


async function cargarUsuarios() {

    const tbody =
        $("listaUsuarios");


    tbody.innerHTML =
        `<tr>
            <td colspan="5">
                Cargando usuarios...
            </td>
        </tr>`;


    const r =
        await fetch(
            "/api/usuarios"
        );


    const data =
        await r.json();


    if (!r.ok) {

        tbody.innerHTML =
            `<tr>
                <td colspan="5">
                    ${data.error}
                </td>
            </tr>`;

        return;
    }


    usuariosSistema =
        data.usuarios;


    mostrarUsuarios(
        usuariosSistema
    );

}


function mostrarUsuarios(lista) {

    $("listaUsuarios").innerHTML =
        lista.map(u => `

        <tr>

            <td>
                <strong>
                    ${u.nombre_corto}
                </strong>
            </td>

            <td>
                ${u.correo}
            </td>

            <td>

                ${
                    u.firmaExiste

                    ? `<span class="status-ok">
                        ● Activa
                       </span>`

                    : `<span class="status-error">
                        ● Sin firma
                       </span>`
                }

            </td>

            <td>
                ${u.banner}
            </td>

            <td>

                <button
                    class="btn-small"
                    onclick="
                    editarUsuario(
                    '${u.correo}'
                    )">

                    Editar

                </button>

            </td>

        </tr>

        `).join("");

}

// =========================================================
// BUSCADOR DE USUARIOS
// =========================================================

function buscarUsuarios() {

    const texto =
        $("buscarUsuario")
        .value
        .trim()
        .toLowerCase();


    if (!texto) {

        mostrarUsuarios(
            usuariosSistema
        );

        return;
    }


    const filtrados =
        usuariosSistema.filter(
            u =>

                u.correo
                .toLowerCase()
                .includes(texto)

                ||

                u.nombre_corto
                .toLowerCase()
                .includes(texto)
        );


    mostrarUsuarios(
        filtrados
    );
}


$("btnBuscarUsuario")
.addEventListener(
    "click",
    buscarUsuarios
);


$("buscarUsuario")
.addEventListener(
    "keydown",
    e => {

        if (e.key === "Enter") {
            buscarUsuarios();
        }

    }
);


$("btnLimpiarBusqueda")
.addEventListener(
    "click",
    () => {

        $("buscarUsuario").value = "";

        mostrarUsuarios(
            usuariosSistema
        );

    }
);

$("buscarUsuario")
.addEventListener(
"input",
e => {

    const texto =
        e.target.value
        .toLowerCase();


    const filtrados =
        usuariosSistema.filter(
            u =>

                u.correo
                .toLowerCase()
                .includes(texto)

                ||

                u.nombre_corto
                .toLowerCase()
                .includes(texto)
        );


    mostrarUsuarios(
        filtrados
    );

});


// =========================================================
// EDITAR USUARIO
// =========================================================

async function editarUsuario(email) {

    const r =
        await fetch(
            "/api/usuario?email=" +
            encodeURIComponent(email)
        );


    const data =
        await r.json();


    if (!r.ok) {

        alert(
            data.error ||
            "No se pudo cargar el usuario"
        );

        return;
    }


    activarTab(
        $("btnNuevoUsuario")
    );


    workspace.style.display =
        "grid";

    vistaUsuarios.style.display =
        "none";

    bannerPanel.style.display =
        "none";


    nombre.value =
        data.nombre || "";

    cargo.value =
        data.cargo || "";

    correo.value =
        data.correo || "";

    celular.value =
        data.celular || "";


    $("previewNombre").textContent =
        data.nombre || "";

    $("previewCargo").textContent =
        data.cargo || "";

    $("previewCelular").textContent =
        data.celular || "";


    if (data.foto)
        $("previewFoto").src =
            data.foto;


    if (data.qrSocial)
        $("previewQrSocial").src =
            data.qrSocial;


    if (data.qrLinkedin)
        $("previewQrLinkedin").src =
            data.qrLinkedin;


    await cargarConfiguracionBanner();

}


// =========================================================
// BANNER GLOBAL
// =========================================================

$("btnBannerGlobal")
.addEventListener(
"click",
() => {

    activarTab(
        $("btnBannerGlobal")
    );


    workspace.style.display =
        "none";

    vistaUsuarios.style.display =
        "none";

    bannerPanel.style.display =
        "block";


    bannerPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

});
