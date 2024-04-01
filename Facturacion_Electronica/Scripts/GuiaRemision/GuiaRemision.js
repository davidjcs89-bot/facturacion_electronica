$(document).ready(function () {
    var idSeleccionado = $("#id-destinatario-seleccionado").val();

    if (idSeleccionado !== null && idSeleccionado !== undefined && idSeleccionado !== 0) {
        seleccionarDestinatario(idSeleccionado);
    }

    $(".btn-seleccionar-destinatario").click(function () { // using the unique ID of the button
        $('#tabla-destinatarios tr').children('td, th').css('background-color', '#0000');
        $(this).closest("tr").children('td, th').css('background-color', '#bbefd3');
    });

});

function BuscarTransportista() {
    $.ajax({
        type: "GET",
        url: "/GuiaRemision/BuscarTransportista/",
        data: { identificacion: $('#id-transportista').val(), idGuia: $("#id-guia").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            if (resultado.existeTransportista === true) {
                $('#btn-editar').attr('disabled', false);
                $('#transportista-id').val(resultado.id);
                $('#id-transportista').val(resultado.identificacion);
                $('#nombre-transportista').val(resultado.nombre);
                $('#placa-transportista').val(resultado.placa);
                $('#email-transportista').val(resultado.email);
            } else {
                $('#btn-editar').attr('disabled', true);
                $('#nombre-transportista').val("");
                $('#placa-transportista').val("");
                $('#email-transportista').val("");
                swal("Transportista no existe");
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

function AbrirModalNuevoTransportista() {
    $("#vistaNuevoTransportista").empty();
    $.ajax({
        type: "GET",
        url: "/Transportista/Create/",
        data: { origen: 1 },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaNuevoTransportista").html("");
            $("#vistaNuevoTransportista").html(response);
            $("#nuevoTransportista").appendTo("body").modal("show");
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

function CrearGuia() {

    $("#frm-nueva-guia").submit();
}

function CambiarPuntoEmision() {
    $.ajax({
        type: "POST",
        url: "/GuiaRemision/CambiarPuntoEmision/",
        data: { idGuia: $("#id-guia").val(), idPuntoEmision: $("#lista-punto-emision").val() },
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

function AbrirModalEditarTransportista() {
    $("#vistaEditarTransportista").empty();
    $.ajax({
        type: "GET",
        url: "/Transportista/Edit/",
        data: { id: $('#transportista-id').val() },
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

function BuscarDestinatario() {
    $.ajax({
        type: "GET",
        url: "/GuiaRemision/BuscarDestinatario/",
        data: { identificacion: $('#id-cliente').val(), idGuia: $("#id-guia").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            if (resultado.existeTransportista === true) {
                $('#btn-editar').attr('disabled', false);
                $('#destinatario-id').val(resultado.id);
                $('#id-destinatario').val(resultado.identificacion);
                $('#nombre-destinatario').val(resultado.nombre);
            } else {
                $('#btn-editar').attr('disabled', true);
                $('#nombre-destinatario').val("");
                swal("Destinatario no existe");
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

function CargarCrearDestinatario() {
    $("#vistaNuevoCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Create/",
        data: { origen: 4 },
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

function CargarEditarDestinatario() {
    $("#vistaEditarCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Edit/",
        data: { id: $('#id').val(), origen: 4 },
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

function CargarAgregarDestinatario() {
    $("#vistaAgregarDestinatario").empty();
    $.ajax({
        type: "GET",
        url: "/GuiaRemision/AgregarDestinatario/",
        data: { id: $("#id-guia").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaAgregarDestinatario").html("");
            $("#vistaAgregarDestinatario").html(response);
            $("#agregar-destinatario").appendTo("body").modal("show");
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

function CargarEditaeDestinatario(id) {
    $("#vistaEditarDestinatario").empty();
    $.ajax({
        type: "GET",
        url: "/GuiaRemision/EditarDestinatario/",
        data: { id, idGuia: $("#id-guia").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaEditarDestinatario").html("");
            $("#vistaEditarDestinatario").html(response);
            $("#editar-destinatario").appendTo("body").modal("show");
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

function AgregarDestinatario() {
    $.ajax({
        type: "POST",
        url: "/GuiaRemision/AgregarDestinatario/",
        cache: false,
        data: $("#frm-agregar-destinatario").serialize(),
        success: function (result) {
            if (result.destinatarioAgregado !== undefined && result.destinatarioAgregado === true) {
                $("#agregar-destinatario").modal("hide");
                location.reload();
            } else {
                $("#vistaAgregarDestinatario").html("");
                $("#vistaAgregarDestinatario").html(result);
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

function seleccionarDestinatario(id) {

    $("#id-destinatario-seleccionado").val(id);
    CargarDetalles(id);
}

function CargarAgregarProducto() {
    var id = $("#id-destinatario-seleccionado").val();
    if (id === null || id === undefined || id <= 0) {
        swal("Seleccione un destinatario");
        return;
    }

    $("#vistaAgregarProducto").empty();
    $.ajax({
        type: "GET",
        url: "/GuiaRemision/AgregarProducto/",
        data: {},
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
        url: "/GuiaRemision/BuscarProducto/",
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

    var cantidadProductos = $("#cantidad").val();

    if (cantidadProductos === null || cantidadProductos === undefined || cantidadProductos <= 0) {
        swal("Ingrese la cantidad");
        return;
    }

    $.ajax({
        type: "POST",
        url: "/GuiaRemision/AgregarProducto/",
        cache: false,
        data: { id, idDestinatario: $("#id-destinatario-seleccionado").val(), idGuia: $("#id-guia").val(), cantidad: cantidadProductos },
        success: function (result) {
            $("#agregarProducto").modal("hide");
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

function CargarDetalles(id) {
    $("#tabla-detalles tbody tr").remove(); 
    $("#tabla-detalles-vista tbody tr").remove(); 
    $.ajax({
        type: "GET",
        url: "/GuiaRemision/ObtenerProductosDestinatario/",
        data: { idDestinatario: id, idGuia: $("#id-guia").val() },
        dataType: "json",
        success: function (response) {
            var trHtml = "";
            var trHtmlVista = "";
            $.each(response, function (i, item) {
                trHtml += "<tr class='data'>"
                    + "<td style='text-align:left'>" + item.Codigo + "</td>"
                    + "<td style='text-align:left'>" + item.Descripcion + "</td>"
                    + "<td style='text-align:left'>" + item.Cantidad + "</td>";

                trHtmlVista += trHtml;
                trHtml += "<td style='text-align:left'><button type='button' class='btn btn-default' onclick='EliminarDetalle(" + item.Id + ")'>Eliminar</button></td>"
                    + "</tr>";
            });
            $("#tabla-detalles").append(trHtml);
            $("#tabla-detalles-vista").append(trHtmlVista);
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
        url: "/GuiaRemision/EliminarDetalle/",
        cache: false,
        data: { id, idDestinatario: $("#id-destinatario-seleccionado").val(), idGuia: $("#id-guia").val()},
        success: function (result) {
            CargarDetalles($("#id-destinatario-seleccionado").val());
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

function EliminarDestinatario(idDestinatario) {

    $.ajax({
        type: "POST",
        url: "/GuiaRemision/EliminarDestinatario/",
        cache: false,
        data: { idDestinatario, idGuia: $("#id-guia").val() },
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
        url: "/GuiaRemision/AgregarAdicional/",
        data: { id: $("#id-guia").val() },
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
        url: "/GuiaRemision/AgregarAdicional/",
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
        url: "/GuiaRemision/EliminarAdicional/",
        cache: false,
        data: { id, idGuia: $("#id-guia").val() },
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

function FinalizarGuiaRemision() {
    $.ajax({
        type: "POST",
        url: "/GuiaRemision/FinalizarGuiaRemision/",
        data: $("#frm-guia").serialize(),
        success: function (resultado) {
            if (resultado.retencionFinalizada === true) {
                swal("Guia de Remisón Finalizada Correctamente");
                window.location.href = '/GuiaRemision/PreImpresion/' + $("#id-guia").val();
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

function EliminarGuia() {
    $.ajax({
        type: "POST",
        url: "/GuiaRemision/Delete/",
        data: { id: $("#id-guia").val() },
        success: function (resultado) {
            if (resultado.guiaBorrada === true) {
                swal("Guia de Remisión Eliminada Correctamente");
                window.location.href = '/GuiaRemision/Index';
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
        url: "/GuiaRemision/GenerarComprobanteElectronico/",
        data: { id: $("#id-guia").val() },
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