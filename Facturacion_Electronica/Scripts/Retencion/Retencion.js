$(document).ready(function () {
    $('#btn-editar').attr('disabled', true);
});

function BuscarCliente() {
    $.ajax({
        type: "GET",
        url: "/Retencion/BuscarCliente/",
        data: { identificacion: $('#id-cliente').val(), idRetencion: $("#id-retencion").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            if (resultado.existeCliente === true) {
                $('#btn-editar').attr('disabled', false);
                $('#id').val(resultado.id);
                $('#id-cliente').val(resultado.identificacion);
                $('#nombre-cliente').val(resultado.nombre);
                $('#direccion-cliente').val(resultado.direccion);
                $('#email-cliente').val(resultado.email);
                $('#celular-cliente').val(resultado.celular);
            } else {
                $('#btn-editar').attr('disabled', true);
                $('#nombre-cliente').val("");
                $('#direccion-cliente').val("");
                $('#email-cliente').val("");
                $('#celular-cliente').val("");
                swal("Cliente no existe");
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

function CargarCrearCliente() {
    $("#vistaNuevoCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Create/",
        data: { origen: 2 },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaNuevoCliente").html("");
            $("#vistaNuevoCliente").html(response);
            $("#nuevoCliete").appendTo("body").modal("show");
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

function CargarEditarCliente() {
    $("#vistaEditarCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Edit/",
        data: { id: $('#id').val(), origen: 2 },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaEditarCliente").html("");
            $("#vistaEditarCliente").html(response);
            $("#editarCliete").appendTo("body").modal("show");
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
$(function () {
    $("#listaImpuesto").ready(function () {
        $("#listaPorcentajes").empty();
        CargarPorcentajes(); 
    });
});

$(function () {
    $("#listaImpuesto").change(function () {
        $("#listaPorcentajes").empty();
        CargarPorcentajes();

    });
});

$(function () {
    $("#listaPorcentajes").change(function () {
        $("#valorPocentaje").empty();
        CargarValorPorcentaje();
    });
});

function CargarPorcentajes() {

    if ($("#listaImpuesto").val() === null || $("#listaImpuesto").val() === undefined) {
        return;
    }

    $.ajax({
        type: "GET",
        url: "/Retencion/CargarPoncentajesImpuesto/",
        dataType: "json",
        data: { id: $("#listaImpuesto").val() },
        success: function (elements) {
            $.each(elements, function (i, element) {
                $("#listaPorcentajes").append('<option value="' + element.Value + '">' + element.Text + "</option>");
            });
            CargarValorPorcentaje();
        },
        error: function (response) {
            alert(response.responseText);
        }
    });
}

function CargarValorPorcentaje() {
    $.ajax({
        type: "GET",
        url: "/Retencion/CargarValorPorcentajeImpuesto/",
        dataType: "json",
        data: { id: $("#listaPorcentajes").val() },
        success: function (response) {
            $("#valorPocentaje").val(response.valor);
            $('#valorPocentaje').attr('readonly', response.porcentajeFijo);
            CalcularValorRetenido();
        },
        error: function (response) {
            alert(response.responseText);
        }
    });
}

$(function () {
    $("#baseImponible").change(function () {
        CalcularValorRetenido();
    });
});

$(function () {
    $("#valorPocentaje").change(function () {
        CalcularValorRetenido();
    });
});


function CalcularValorRetenido() {
    $.ajax({
        type: "GET",
        url: "/Retencion/CalcularValorRetenido/",
        dataType: "json",
        data: { idPorcentaje: $("#listaPorcentajes").val(), baseImponible: $("#baseImponible").val(), porcentaje : $("#valorPocentaje").val()},
        success: function (response) {
            $("#valorRetenido").val(response.valor);
        },
        error: function (response) {
            alert(response.responseText);
        }
    });
}

function EliminarDetalle(id) {
    $.ajax({
        type: "POST",
        url: "/Retencion/EliminarDetalle/",
        cache: false,
        data: { id, idRetencion: $("#id-retencion").val() },
        success: function (result) {
            window.location.href = '/Retencion/Edit/' + $("#id-retencion").val();
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
        url: "/Retencion/CambiarPuntoEmision/",
        data: { idRetencion: $("#id-retencion").val(), idPuntoEmision: $("#lista-punto-emision").val() },
        success: function (datos) {
            if (datos.actualizado === true) {
                window.location.href = '/Retencion/Edit/' + $("#id-retencion").val();
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
        url: "/Retencion/AgregarAdicional/",
        data: { id: $("#id-retencion").val() },
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
        url: "/Retencion/AgregarAdicional/",
        cache: false,
        data: $("#frm-agregar-adicional").serialize(),
        success: function (result) {
            if (result.datoAgregado !== undefined && result.datoAgregado === true) {
                $("#agregarAdicional").modal("hide");
                window.location.href = '/Retencion/Edit/' + $("#id-retencion").val();
                //location.reload();
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
        url: "/Retencion/EliminarAdicional/",
        cache: false,
        data: { id, idRetencion: $("#id-retencion").val() },
        success: function (result) {
            //location.reload();
            window.location.href = '/Retencion/Edit/' + $("#id-retencion").val();
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

function FinalizarRetencion() {
    $.ajax({
        type: "POST",
        url: "/Retencion/FinalizarRetencion/",
        data: $("#frm-retencion").serialize(),
        success: function (resultado) {
            if (resultado.retencionFinalizada === true) {
                swal("Retención Finalizada Correctamente");
                window.location.href = '/Retencion/PreImpresion/' + $("#id-retencion").val();
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

function EliminarRetencion() {
    $.ajax({
        type: "POST",
        url: "/Retencion/Delete/",
        data: { id: $("#id-retencion").val() },
        success: function (resultado) {
            if (resultado.retencionBorrada === true) {
                swal("Retención Eliminada Correctamente");
                window.location.href = '/Retencion/Index';
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
        url: "/Retencion/GenerarComprobanteElectronico/",
        data: { id: $("#id-retencion").val() },
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