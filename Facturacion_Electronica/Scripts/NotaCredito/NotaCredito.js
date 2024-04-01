function FinalizarNotaCredito() {
    $.ajax({
        type: "POST",
        url: "/NotaCredito/Create/",
        data: $("#frm-nota-credito").serialize(),
        success: function (resultado) {
            if (resultado.notaGenerada === true) {
                swal("Factura Finalizada Correctamente");
                window.location.href = '/NotaCredito/PreImpresion/' + $("#id-nota-credito").val();
            } else {
                swal(resultado.error);
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

function EliminarNotaCredito() {
    $.ajax({
        type: "POST",
        url: "/NotaCredito/Delete/",
        data: { id: $("#id-nota-credito").val() },
        success: function (resultado) {
            if (resultado.retencionBorrada === true) {
                swal("Nota de Crédito Eliminada Correctamente");
                window.location.href = '/NotaCredito/Index';
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

function CambiarPuntoEmision() {
    $.ajax({
        type: "POST",
        url: "/NotaCredito/CambiarPuntoEmision/",
        data: { idNota: $("#id-nota-credito").val(), idPuntoEmision: $("#lista-punto-emision").val() },
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

function CargarAgregarAdicional() {
    $("#vistaAgregarAdicional").empty();
    $.ajax({
        type: "GET",
        url: "/NotaCredito/AgregarAdicional/",
        data: { id: $("#id-nota-credito").val() },
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
        url: "/NotaCredito/AgregarAdicional/",
        cache: false,
        data: $("#frm-agregar-adicional").serialize(),
        success: function (result) {
            if (result.datoAgregado !== undefined && result.datoAgregado === true) {
                $("#agregarAdicional").modal("hide");
                //window.location.href = '/Retencion/Edit/' + $("#id-retencion").val();
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
        url: "/NotaCredito/EliminarAdicional/",
        cache: false,
        data: { id, idNotaCredito: $("#id-nota-credito").val() },
        success: function (result) {
            location.reload();
            //window.location.href = '/Retencion/Edit/' + $("#id-retencion").val();
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
        url: "/NotaCredito/GenerarComprobanteElectronico/",
        data: { id: $("#id-nota-credito").val() },
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