$(document).ready(function () {
    $("#nuevoTransportistaBtn").click(function () {
        CargarVistaCrearTransportista();
    });
});


function CargarVistaCrearTransportista() {
    $("#vistaNuevoTransportista").empty();
    $.ajax({
        type: "GET",
        url: "/Transportista/Create/",
        data: {origen:0},
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaNuevoTransportista").html("");
            $("#vistaNuevoTransportista").html(response);
            $("#modalNuevoTransportista").appendTo("body").modal("show");
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

function CrearTransportista() {
    $.ajax({
        type: "POST",
        url: "/Transportista/Create/",
        cache: false,
        data: $("#frm-nuevo-transportista").serialize(),
        success: function (result) {
            if (result.transportistaCreado !== undefined && result.transportistaCreado === true) {
                console.log(result);
                $("#nuevoTransportista").modal("hide");
                if (result.origen === 1) {//desde guia
                    $('#id-transportista').val(result.identificacion);
                    $('#btn-buscar-transportista').click();
                } else {
                    $('#BuscarTodos').prop('checked', false);
                    $("#buscar-id").val(result.identificacion);
                    $('#btn-buscar').click();
                    $("#buscar-nombre").val("");
                }


            } else {
                $("#vistaNuevoTransportista").html("");
                $("#vistaNuevoTransportista").html(result);
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

function CargarVistaEditarTransportista(idTransportista) {
    $("#vistaEditarTransportista").empty();
    $.ajax({
        type: "GET",
        url: "/Transportista/Edit/",
        data: { id: idTransportista },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaEditarTransportista").html("");
            $("#vistaEditarTransportista").html(response);
            $("#modalEditarTransportista").appendTo("body").modal("show");
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

function EditarTransportista() {
    $.ajax({
        type: "POST",
        url: "/Transportista/Edit/",
        cache: false,
        data: $("#frm-editar-transportista").serialize(),
        success: function (result) {
            console.log(result);
            if (result.transportistaActualizado !== undefined && result.transportistaActualizado === true) {
                $('#BuscarTodos').prop('checked', false);
                $("#buscar-id").val(result.identificacion);
                $('#btn-buscar-transportista').click();
                $("#buscar-nombre").val("");
                $("#modalEditarTransportista").modal("hide");
            } else {
                $("#vistaEditarTransportista").html("");
                $("#vistaEditarTransportista").html(result);
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