$(document).ready(function () {
    $("#crearBodega").click(function () {
        CargarVistaCrearBodega();
    });
});

function CargarVistaCrearBodega() {
    $("#vistaNuevaBodega").empty();
    $.ajax({
        type: "GET",
        url: "/Bodega/Create/",
        data: { origen: 0 },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaNuevaBodega").html("");
            $("#vistaNuevaBodega").html(response);
            $("#nuevaBodega").appendTo("body").modal("show");
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


function CrearBodega() {

    $.ajax({
        type: "POST",
        url: "/Bodega/Create/",
        cache: false,
        data: $("#frm-nueva-bodega").serialize(),
        success: function (result) {
            if (result.bodegaCreada !== undefined && result.bodegaCreada === true) {
                $("#nuevaBodega").modal("hide");
                location.reload();
            } else {
                $("#vistaNuevaBodega").html("");
                $("#vistaNuevaBodega").html(result);
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

function CargarVistaEditarBodega(idBodega) {
    $("#vistaEditarBodega").empty();
    $.ajax({
        type: "GET",
        url: "/Bodega/Edit/",
        data: { id: idBodega},
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaEditarBodega").html("");
            $("#vistaEditarBodega").html(response);
            $("#editarBodega").appendTo("body").modal("show");
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

function ModificarBodega() {

    $.ajax({
        type: "POST",
        url: "/Bodega/Edit/",
        cache: false,
        data: $("#frm-editar-bodega").serialize(),
        success: function (result) {
            if (result.bodegaModificada !== undefined && result.bodegaModificada === true) {
                $("#editarBodega").modal("hide");
                location.reload();
            } else {
                $("#vistaEditarBodega").html("");
                $("#vistaEditarBodega").html(result);
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