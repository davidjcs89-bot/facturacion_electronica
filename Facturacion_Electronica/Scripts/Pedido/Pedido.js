$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip();
});

$(document).ready(function () {
    check = document.getElementById("consumidor-final");

    if (check.checked === true) // Si consumidor-final está activado
    {
        $('#id-cliente').attr('readonly', true);
        $('#btn-buscar').attr('disabled', true);
        $('#btn-crear').attr('disabled', true);
        $('#btn-editar').attr('disabled', true);
        $('#btn-buscar-nombre').attr('disabled', true);
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
            $('#btn-buscar-nombre').attr('disabled', true);
        }
        else // Si no está activada
        {
            $('#id-cliente').attr('readonly', false);
            $('#btn-crear').attr('disabled', false);
            $('#btn-buscar').attr('disabled', false);
            $('#btn-editar').attr('disabled', true);
            $('#btn-buscar-nombre').attr('disabled', false);
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
            data: { id: $('#lista-punto-emision').val() },
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


function BuscarConsumidorFinal() {
    $.ajax({
        type: "GET",
        url: "/Pedido/BuscarConsumidorFinal/",
        data: { idFactura: $("#id-pedido").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (datos) {
            if (datos.clienteActualizado === true) {
                $('#id-cliente').val(datos.identificacion);
                $('#nombre-cliente').val(datos.nombre);
                $('#direccion-cliente').val(datos.direccion);
                $('#email-cliente').val('hola@hola.com');
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

function CargarAgregarProducto() {
    $("#vistaAgregarProducto").empty();
    $.ajax({
        type: "GET",
        url: "/Pedido/AgregarProducto/",
        data: { idPedido: $("#id-pedido").val() },
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
        url: "/Pedido/AgregarProducto/",
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
        url: "/Pedido/AgregarProductoPedido/",
        cache: false,
        data: { id, idFactura: $("#id-pedido").val(), cantidad: $("#nro-registros").val() },
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

function ActualizarDetallePedido(id) {

    var precio = $('#' + id + '-precio').val();
    var qty = $('#' + id + '-qty').val();
    var desc = $('#' + id + '-desc').val();
    var adic = $('#' + id + '-adic').val();

    if (Number(precio) >= 0 && Number(qty) >= 0 && Number(desc) >= 0) {
        $(".loading").show();
        $.ajax({
            type: "POST",
            url: "/Pedido/ActualizarDetalle/",
            cache: false,
            data: { id, idFactura: $("#id-pedido").val(), nuevoPrecio: precio, nuevacantidad: qty, porcentajeDescuento: desc, adicional: adic },
            success: function (result) {
                $(".loading").hide();

                if (result.detalleActualizado) {
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
    } else {
        location.reload();
    }
}

function BuscarCliente() {
    $.ajax({
        type: "GET",
        url: "/Pedido/BuscarCliente/",
        data: { identificacion: $('#id-cliente').val(), idFactura: $("#id-pedido").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            if (resultado.existeCliente === true) {
                $('#btn-editar').attr('disabled', false);
                $('#id').val(resultado.id);
                $('#id-cliente').val(resultado.identificacion);
                $('#cedula-cliente').val(resultado.identificacion);
                $('#codigo-cliente').val(resultado.codigo);
                $('#nombre-cliente').val(resultado.nombre);
                $('#direccion-cliente').val(resultado.direccion);
                //$('#email-cliente').val(resultado.email);
                $('#email-cliente').val('hola1');
                $('#celular-cliente').val(resultado.celular);
            } else {
                $('#btn-editar').attr('disabled', true);
                $('#nombre-cliente').val("");
                $('#cedula-cliente').val("");
                $('#codigo-cliente').val("");
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

function BuscarClientePorCodigo() {
    $.ajax({
        type: "GET",
        url: "/Pedido/BuscarClientePorCodigo/",
        data: { codigo: $('#id-cliente').val(), idFactura: $("#id-pedido").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            if (resultado.existeCliente === true) {
                $('#btn-editar').attr('disabled', false);
                $('#id').val(resultado.id);
                $('#id-cliente').val(resultado.identificacion);
                $('#cedula-cliente').val(resultado.identificacion);
                $('#codigo-cliente').val(resultado.codigo);
                $('#nombre-cliente').val(resultado.nombre);
                $('#direccion-cliente').val(resultado.direccion);
                //$('#email-cliente').val(resultado.email);
                $('#email-cliente').val('hola1');
                $('#celular-cliente').val(resultado.celular);
            } else {
                $('#btn-editar').attr('disabled', true);
                $('#nombre-cliente').val("");
                $('#cedula-cliente').val("");
                $('#codigo-cliente').val("");
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

function EliminarDetalle(id) {
    $.ajax({
        type: "POST",
        url: "/Pedido/EliminarDetalle/",
        cache: false,
        data: { id, idFactura: $("#id-pedido").val() },
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

function CargarCrearCliente() {
    $("#vistaNuevoCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Create/",
        data: { origen: 1 },
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
        data: { id: $('#id').val(), origen: 1 },
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

function CargarAgregarAbono() {
    $("#vistaAgregarAbono").empty();
    $.ajax({
        type: "GET",
        url: "/Pedido/AgregarAbono/",
        data: { id: $("#id-pedido").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaAgregarAbono").html("");
            $("#vistaAgregarAbono").html(response);
            $("#agregarAbono").appendTo("body").modal("show");
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

function AgregarAbono() {
    $.ajax({
        type: "POST",
        url: "/Pedido/AgregarAbono/",
        cache: false,
        data: $("#frm-agregar-abono").serialize(),
        success: function (result) {
            if (result.datoAgregado !== undefined && result.datoAgregado === true) {
                $("#agregarAbono").modal("hide");
                location.reload();
            } else {
                $("#vistaAgregarAbono").html("");
                $("#vistaAgregarAbono").html(result);
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

function EliminarAbono(id) {
    $.ajax({
        type: "POST",
        url: "/Pedido/EliminarAbono/",
        cache: false,
        data: { id, idFactura: $("#id-pedido").val() },
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

function FinalizarPedido() {
    $.ajax({
        type: "POST",
        url: "/Pedido/FinalizarPedido/",
        data: { idPedido: $("#id-pedido").val() },
        success: function (resultado) {
            if (resultado.pedidoFinalizado === true) {
                swal("Pedido Finalizado Correctamente");
                window.location.href = '/Pedido/View/' + $("#id-pedido").val();

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

function AnularPedido() {
    $.ajax({
        type: "POST",
        url: "/Pedido/Delete/",
        data: { id: $("#id-pedido").val() },
        success: function (resultado) {
            if (resultado.pedidoBorrado === true) {
                swal("Pedido Anulado Correctamente");
                window.location.href = '/Pedido/Index';
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

function GenerarFactura() {
    $.ajax({
        type: "POST",
        url: "/Pedido/GenerarFactura/",
        data: { id: $("#id-pedido").val() },
        success: function (resultado) {
            if (resultado.facturaGenerada === true) {
                swal("Pedido Facurado Correctamente");
                window.location.href = '/Factura/Edit/' + resultado.idFactura;
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