$(document).ready(function () {


    $('#btn-editar').attr('disabled', true);
    //$('#agregar-producto').attr('disabled', true);

    $('#lista-punto-emision').change(function () {
        $.ajax({
            type: "GET",
            url: "/LiquidacionCompra/ObtenerDatosLiquidacionPuntoEmision/",
            data: { id: $('#lista-punto-emision').val() },
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (resultado) {
                if (resultado.existenPuntoEmison === true) {
                    $('#numero-liquidacion').html(resultado.numeroLiquidacion);
                    $('#direccion-sucursal').html(resultado.direccion);
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

$("#codigo-producto-buscar").keypress(function (event) {
    console.log("s");
    if (event.which === 13) {
        BuscarProducto();
    }
});

function CambiarPuntoEmision() {
    $.ajax({
        type: "POST",
        url: "/LiquidacionCompra/CambiarPuntoEmision/",
        data: { idLiquidacion: $("#id-liquidacion").val(), idPuntoEmision: $("#lista-punto-emision").val() },
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

function BuscarConsumidorFinal() {
    $.ajax({
        type: "GET",
        url: "/LiquidacionCompra/BuscarConsumidorFinal/",
        data: { idLiquidacion: $("#id-liquidacion").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (datos) {
            if (datos.clienteActualizado === true) {
                $('#id-cliente').val(datos.identificacion);
                $('#nombre-cliente').val(datos.nombre);
                $('#direccion-cliente').val(datos.direccion);
                $('#email-cliente').val(datos.email);
                $('#celular-cliente').val(datos.celular);
            } else {
                var check = document.getElementById("consumidor-final");
                check.checked = false;
                $('#id-cliente').attr('readonly', false);
                $('#btn-buscar').attr('disabled', false);
                swal(datos.mensaje);
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

function BuscarCliente() {
    $.ajax({
        type: "GET",
        url: "/LiquidacionCompra/BuscarCliente/",
        data: { identificacion: $('#id-cliente').val(), idLiquidacion: $("#id-liquidacion").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            if (resultado.existeCliente === true) {
                $('#btn-editar').attr('disabled', false);
                $('#agregar-producto').attr('disabled', false);
                $('#id').val(resultado.id);
                $('#id-cliente').val(resultado.identificacion);
                $('#nombre-cliente').val(resultado.nombre);
                $('#direccion-cliente').val(resultado.direccion);
                $('#email-cliente').val(resultado.email);
                $('#celular-cliente').val(resultado.celular);
            } else {
                $('#btn-editar').attr('disabled', true);
                $('#agregar-producto').attr('disabled', true);
                $('#nombre-cliente').val("");
                $('#direccion-cliente').val("");
                $('#email-cliente').val("");
                $('#celular-cliente').val("");
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

function CargarCrearCliente() {
    $("#vistaNuevoCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Create/",
        data: { origen: 3 },
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
        data: { id: $('#id').val(), origen: 3 },
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

function CargarAgregarProducto() {
    $("#vistaAgregarProducto").empty();
    $.ajax({
        type: "GET",
        url: "/LiquidacionCompra/AgregarProducto/",
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
        url: "/LiquidacionCompra/AgregarProducto/",
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
    $.ajax({
        type: "POST",
        url: "/LiquidacionCompra/AgregarProductoFactura/",
        cache: false,
        data: { id, idLiquidacion: $("#id-liquidacion").val() },
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

function ActualizarAdicionalDetalle(id, selectObject) {
    var adiciona = selectObject.value;
    if (adiciona !== null && adiciona !== undefined) {
        $.ajax({
            type: "POST",
            url: "/LiquidacionCompra/ActualizarAdicionalDetalle/",
            cache: false,
            data: { id, idLiquidacion: $("#id-liquidacion").val(), adicional: adiciona },
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
    } else {
        location.reload();
    }
}

function ActualizarPrecioDetalle(id, selectObject) {
    var precio = selectObject.value;
    if (Number(precio) > 0) {
        $.ajax({
            type: "POST",
            url: "/LiquidacionCompra/ActualizarPrecioDetalle/",
            cache: false,
            data: { id, idLiquidacion: $("#id-liquidacion").val(), nuevoPrecio: precio },
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
    } else {
        location.reload();
    }
}

function ActualizarCantidadDetalle(id, selectObject) {
    var cantidad = selectObject.value;
    if (Number(cantidad) > 0) {
        $.ajax({
            type: "POST",
            url: "/LiquidacionCompra/ActualizarCantidadDetalle/",
            cache: false,
            data: { id, idLiquidacion: $("#id-liquidacion").val(), nuevaCantidad: cantidad },
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
    } else {
        location.reload();
    }
}

function ActualizarPorcentajeDescuentoDetalle(id, selectObject) {
    var porcentaje = selectObject.value;
    if (Number(porcentaje) >= 0) {
        $.ajax({
            type: "POST",
            url: "/LiquidacionCompra/ActualizarPorcentajeDescuentoDetalle/",
            cache: false,
            data: { id, idLiquidacion: $("#id-liquidacion").val(), porcentaje: porcentaje },
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
    } else {
        location.reload();
    }
}

function EliminarDetalle(id) {
    $.ajax({
        type: "POST",
        url: "/LiquidacionCompra/EliminarDetalle/",
        cache: false,
        data: { id, idLiquidacion: $("#id-liquidacion").val() },
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

function CargarAgregarPago() {
    $("#vistaAgregarPago").empty();
    $.ajax({
        type: "GET",
        url: "/LiquidacionCompra/AgregarPago/",
        data: { id: $("#id-liquidacion").val() },
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
        url: "/LiquidacionCompra/AgregarPago/",
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
        url: "/LiquidacionCompra/EliminarPago/",
        cache: false,
        data: { id, idLiquidacion: $("#id-liquidacion").val() },
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
        url: "/LiquidacionCompra/AgregarAdicional/",
        data: { id: $("#id-liquidacion").val() },
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
        url: "/LiquidacionCompra/AgregarAdicional/",
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
        url: "/LiquidacionCompra/EliminarAdicional/",
        cache: false,
        data: { id, idLiquidacion: $("#id-liquidacion").val() },
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

function FinalizarLiquidacion() {
    $.ajax({
        type: "POST",
        url: "/LiquidacionCompra/FinalizarLiquidacion/",
        data: $("#frm-liquidacion").serialize(),
        success: function (resultado) {
            if (resultado.liquidacionFinalizada === true) {
                swal("Liquidación Finalizada Correctamente");
                window.location.href = '/LiquidacionCompra/PreImpresion/' + $("#id-liquidacion").val();
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

function EliminarLiquidacion() {
    $.ajax({
        type: "POST",
        url: "/LiquidacionCompra/Delete/",
        data: { id: $("#id-liquidacion").val() },
        success: function (resultado) {
            if (resultado.liquidacionBorrada === true) {
                swal("Liquidación Eliminada Correctamente");
                window.location.href = '/LiquidacionCompra/Index';
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
        url: "/LiquidacionCompra/GenerarComprobanteElectronico/",
        data: { id: $("#id-liquidacion").val() },
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