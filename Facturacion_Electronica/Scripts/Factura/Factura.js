$(document).ready(function () {
    check = document.getElementById("consumidor-final");

    if (check.checked === true) // Si consumidor-final está activado
    {
        $('#id-cliente').attr('readonly', true);
        $('#btn-buscar').attr('disabled', true);
        $('#btn-crear').attr('disabled', true);
        $('#btn-editar').attr('disabled', true);
    }
    else // Si no está activada
    {
        $('#id-cliente').attr('readonly', false);
    }

    $('#consumidor-final').change(function () {
        check = document.getElementById("consumidor-final");

        if (check.checked === true) // Si consumidor-final está activado
        {
            $('#id-cliente').attr('readonly', true);
            BuscarConsumidorFinal();
            $('#btn-buscar').attr('disabled', true);
            $('#btn-crear').attr('disabled', true);
            $('#btn-editar').attr('disabled', true);
        }
        else // Si no está activada
        {
            $('#id-cliente').attr('readonly', false);
            $('#btn-crear').attr('disabled', false);
            $('#btn-buscar').attr('disabled', false);
            $('#btn-editar').attr('disabled', true);
            $('#id-cliente').val("");
            $('#nombre-cliente').val("");
            $('#direccion-cliente').val("");
            $('#email-cliente').val("");
            $('#celular-cliente').val("");
        }
    });

    $('#lista-punto-emision').change(function () {
        $.ajax({
            type: "GET",
            url: "/Factura/ObtenerDatosFacturaPuntoEmision/",
            data: { id: $('#lista-punto-emision').val()},
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (resultado) {
                if (resultado.existenPuntoEmison === true) {
                    $('#numero-factura').html(resultado.numeroFactura);
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
    if (event.which === 13) {
        BuscarProducto();
    }
});

function CambiarPuntoEmision() {
    $.ajax({
        type: "POST",
        url: "/Factura/CambiarPuntoEmision/",
        data: { idFactura: $("#id-factura").val(), idPuntoEmision: $("#lista-punto-emision").val() },
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

function ActualizarFecha() {
    $.ajax({
        type: "POST",
        url: "/Factura/ActualizarFechaFactura/",
        data: { idFactura: $("#id-factura").val(), nuevaFecha: $("#fecha-emisison-factura").val() },
        success: function (datos) {
            if (datos.fechaActualizada === false) {
                swal(datos.mensaje);
            } else {
                swal("Fecha modificada correctamente");
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
        url: "/Factura/BuscarConsumidorFinal/",
        data: { idFactura :  $("#id-factura").val()},
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
        url: "/Factura/BuscarCliente/",
        data: { identificacion: $('#id-cliente').val(), idFactura: $("#id-factura").val()},
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
        data: {origen:1},
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
        data: { id: $('#id').val(), origen:1 },
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
        url: "/Factura/AgregarProducto/",
        data: { },
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
        url: "/Factura/AgregarProducto/",
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
        url: "/Factura/AgregarProductoFactura/",
        cache: false,
        data: { id, idFactura: $("#id-factura").val()},
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
            url: "/Factura/ActualizarAdicionalDetalle/",
            cache: false,
            data: { id, idFactura: $("#id-factura").val(), adicional: adiciona },
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
            url: "/Factura/ActualizarPrecioDetalle/",
            cache: false,
            data: { id, idFactura: $("#id-factura").val(), nuevoPrecio: precio },
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
            url: "/Factura/ActualizarCantidadDetalle/",
            cache: false,
            data: { id, idFactura: $("#id-factura").val(), nuevaCantidad: cantidad },
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
            url: "/Factura/ActualizarPorcentajeDescuentoDetalle/",
            cache: false,
            data: { id, idFactura: $("#id-factura").val(), porcentaje: porcentaje },
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
            url: "/Factura/EliminarDetalle/",
            cache: false,
            data: { id, idFactura: $("#id-factura").val()},
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
        url: "/Factura/AgregarPago/",
        data: { id: $("#id-factura").val()},
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
        url: "/Factura/AgregarPago/",
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
        url: "/Factura/EliminarPago/",
        cache: false,
        data: { id, idFactura: $("#id-factura").val() },
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
        url: "/Factura/AgregarAdicional/",
        data: { id: $("#id-factura").val() },
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
        url: "/Factura/AgregarAdicional/",
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
        url: "/Factura/EliminarAdicional/",
        cache: false,
        data: { id, idFactura: $("#id-factura").val() },
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

function FinalizarFactura() {
    $.ajax({
        type: "POST",
        url: "/Factura/FinalizarFactura/",
        data: { idFacura: $("#id-factura").val() },
        success: function (resultado) {
            if (resultado.facturaFinalizada === true) {
                swal("Factura Finalizada Correctamente");
                window.location.href = '/Factura/PreImpresion/' + $("#id-factura").val();

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

function abrirImpresion(id) {

    return new Promise(resolve => {
        setTimeout(() => {
            window.open('/Factura/Impresion/' + id, '_blank');
        }, 2000);
    });
}

async function imprimir(id) {

    await abrirImpresion(id);
    // expected output: "resolved"
}

function EliminarFactura() {
    $.ajax({
        type: "POST",
        url: "/Factura/Delete/",
        data: { id: $("#id-factura").val() },
        success: function (resultado) {
            if (resultado.facturaBorrada === true) {
                swal("Factura Eliminada Correctamente");
                window.location.href = '/Factura/Index';
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
        url: "/Factura/GenerarComprobanteElectronico/",
        data: { id: $("#id-factura").val() },
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