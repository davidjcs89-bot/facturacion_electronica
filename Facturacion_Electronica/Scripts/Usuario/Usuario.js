function hideOrShowPassword() {
    var password1, check;

    password1 = document.getElementById("txtClave");
    check = document.getElementById("ver");

    if (check.checked === true) // Si la checkbox de mostrar contraseña está activada
    {
        password1.type = "text";
    }
    else // Si no está activada
    {
        password1.type = "password";
    }
}

function mostraOcultarNotaSuscripcion() {
    var estadoNota = document.getElementById("txtNota").style.display;
    if (estadoNota === "none") {
        document.getElementById("txtNota").style.display = "block";
    } else {
        document.getElementById("txtNota").style.display = "none";
    }
}

function CargarDiasRestantesHabilitacion() {
    $.ajax({
        type: "GET",
        url: "/Usuario/ObtenerDiasRestantes/",
        data: {},
        contentType: "application/json; charset=utf-8",
        success: function (response) {
            $("#txt-dias-restantes").html("<strong>Dias Disponibles: </strong>" + response.dias);
        },
        failure: function (response) {
            $("#txt-dias-restantes").text("");
        },
        error: function (response) {
            $("#txt-dias-restantes").text("");
        }
    });
}

function EliminarUsuario(id) {
    $.ajax({
        type: "POST",
        url: "/Usuario/Delete/",
        cache: false,
        data: { id },
        success: function (result) {
            if (result.eliminado) {
                swal('Usario eliminado');
                setTimeout(() => {
                    window.location.href = '/Usuario/Index/';
                }, 2000);
            } else {
                swal(result.mensaje);
            }
            
        },
        failure: function (response) {
            alert(response.responseText);
            alert("error ");
        },
        error: function (response) {
            alert(response.responseText);
        }
    });
}

$(document).ready(function () {
    $(".txt-mayusc").keyup(function () {
        $(this).val($(this).val().toUpperCase());
    });

    //$("#txt-dias-restantes").html("<strong>Dias Disponibles: </strong>66");
    CargarDiasRestantesHabilitacion();
});
