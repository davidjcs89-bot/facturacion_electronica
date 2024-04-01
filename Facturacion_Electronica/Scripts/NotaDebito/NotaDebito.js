

function AgregarDetalleNotaDebito() {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/AgregarDetalle/",
        cache: false,
        data: { razon: $("#razon").val(), valor: $("#valor").val(), id: $("#id-nota-debito").val() },
        success: function (result) {
            if (result.datoAgregado !== undefined && result.datoAgregado === true) {
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
            swal("Datos Incorrectos");
        }
    });
}

function EliminarDetalle(id) {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/EliminarDetalle/",
        cache: false,
        data: { id: id, idNotaDebito: $("#id-nota-debito").val() },
        success: function (result) {
            if (result.datoEliminado !== undefined && result.datoEliminado === true) {
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

function CambiarPuntoEmision() {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/CambiarPuntoEmision/",
        data: { idNota: $("#id-nota-debito").val(), idPuntoEmision: $("#lista-punto-emision").val() },
        success: function (datos) {
            if (datos.actualizado === true) {
                location.reload();
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
    $('#lista-iva').change(function () {
        $.ajax({
            type: "POST",
            url: "/NotaDebito/ActualizarIva/",
            cache: false,
            data: { id: $("#id-nota-debito").val(), idIva: $(this).val()},
            success: function (result) {
                if (result.actualizacion !== undefined && result.actualizacion === true) {
                    location.reload();
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
    });
});

function CargarAgregarPago() {
    $("#vistaAgregarPago").empty();
    $.ajax({
        type: "GET",
        url: "/NotaDebito/AgregarPago/",
        data: { id: $("#id-nota-debito").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaAgregarPago").html("");
            $("#vistaAgregarPago").html(response);
            $("#agregarPago").appendTo("body").modal("show");
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

function AgregarPago() {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/AgregarPago/",
        cache: false,
        data: $("#frm-agregar-pago").serialize(),
        success: function (result) {
            if (result.pagoAgregado !== undefined && result.pagoAgregado === true) {
                $("#agregarPago").modal("hide");
                location.reload();
            } else {
                $("#vistaAgregarPago").html("");
                $("#vistaAgregarPago").html(result);
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

function EliminarPago(id) {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/EliminarPago/",
        cache: false,
        data: { id, idNota: $("#id-nota-debito").val() },
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

function CargarAgregarAdicional() {
    $("#vistaAgregarAdicional").empty();
    $.ajax({
        type: "GET",
        url: "/NotaDebito/AgregarAdicional/",
        data: { id: $("#id-nota-debito").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaAgregarAdicional").html("");
            $("#vistaAgregarAdicional").html(response);
            $("#agregarAdicional").appendTo("body").modal("show");
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

function AgregarDatoAdicional() {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/AgregarAdicional/",
        cache: false,
        data: $("#frm-agregar-adicional").serialize(),
        success: function (result) {
            if (result.datoAgregado !== undefined && result.datoAgregado === true) {
                $("#agregarAdicional").modal("hide");
                location.reload();
            } else {
                $("#vistaAgregarAdicional").html("");
                $("#vistaAgregarAdicional").html(result);
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

function EliminarAdicional(id) {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/EliminarAdicional/",
        cache: false,
        data: { id, idNota: $("#id-nota-debito").val() },
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
        url: "/NotaDebito/FinalizarNotaDebito/",
        data: $("#frm-nota-debito").serialize(),
        success: function (resultado) {
            if (resultado.retencionFinalizada === true) {
                swal("Nota de Débito Finalizada Correctamente");
                window.location.href = '/NotaDebito/PreImpresion/' + $("#id-nota-debito").val();
            } else {
                swal(resultado.mensaje);
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

function Eliminar() {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/Delete/",
        data: { id: $("#id-nota-debito").val() },
        success: function (resultado) {
            if (resultado.retencionBorrada === true) {
                swal("Retención Eliminada Correctamente");
                window.location.href = '/NotaDebito/Index';
            } else {
                swal(resultado.mensaje);
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

function GenerarComrprobante() {
    $.ajax({
        type: "POST",
        url: "/NotaDebito/GenerarComprobanteElectronico/",
        data: { id: $("#id-nota-debito").val() },
        dataType: "json",
        success: function (response) {
            if (response.generado === true) {
                swal(response.mensaje);
            } else {
                swal(response.mensaje);
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