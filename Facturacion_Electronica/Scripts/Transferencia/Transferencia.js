
function CargarAgregarProducto() {
    $("#vistaAgregarProducto").empty();
    $.ajax({
        type: "GET",
        url: "/TransferenciaInventario/AgregarProducto/",
        data: { idTransferencia: $("#id-transferencia").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaAgregarProducto").html("");
            $("#vistaAgregarProducto").html(response);
            $("#agregarProducto").appendTo("body").modal("show");
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

function BuscarProducto() {
    $.ajax({
        type: "POST",
        url: "/TransferenciaInventario/AgregarProducto/",
        cache: false,
        data: $("#frm-agregar-producto").serialize(),
        success: function (result) {
            $("#vistaAgregarProducto").html("");
            $("#vistaAgregarProducto").html(result);
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

function AgregarProducto(id) {

    var qty = $('#' + 'qty-' + id).val();

    $.ajax({
        type: "POST",
        url: "/TransferenciaInventario/AgregarProductoTransferencia/",
        cache: false,
        data: { id, idTransferencia: $("#id-transferencia").val(), cantidad: qty },
        success: function (result) {
            $("#agregarProducto").modal("hide");

            if (result.detalleAgregado) {
                location.reload();
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

function EliminarDetalle(id) {
    $.ajax({
        type: "POST",
        url: "/TransferenciaInventario/EliminarDetalle/",
        cache: false,
        data: { id, idTransferencia: $("#id-transferencia").val() },
        success: function (result) {
            location.reload();
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

function Finalizar() {
    $.ajax({
        type: "POST",
        url: "/TransferenciaInventario/Finalizar/",
        cache: false,
        data: { id: $("#id-transferencia").val() },
        success: function (result) {

            if (result.finalizado) {
                swal("Finalizado Correctamente");
                location.reload();
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

function Anular() {
    $.ajax({
        type: "POST",
        url: "/TransferenciaInventario/Anular/",
        cache: false,
        data: { id: $("#id-transferencia").val() },
        success: function (result) {
            if (result.anulado) {
                swal("Anulado Correctamente");
                location.reload();
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