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
                //$('#email-cliente').val(resultado.email);
                $('#email-cliente').val('hola1');
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

/*BUSCAR POR NOMBRE AL CLIENTE*/
// Variable global para almacenar los clientes
var clientesEncontrados = [];

function BuscarClienteByNombre() {
    $(".loading").show();

    $.ajax({
        type: "GET",
        url: "/Factura/BuscarClienteByNombre/",
        data: { nombre: $('#cliente-name').val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            $(".loading").hide();

            if (resultado.length > 0) {

                // Almacenar los clientes obtenidos en la variable global
                clientesEncontrados = resultado;

                // Limpiar la tabla antes de cargar los nuevos datos
                $('#tabla-clientes tbody').empty();

                // Llenar la tabla con los clientes encontrados
                resultado.forEach(function (cliente) {
                    var fila = '<tr data-id="' + cliente.id + '">' +
                        '<td>' + cliente.nombre + '</td>' +
                        '<td>' + cliente.identificacion + '</td>' +
                        '<td><button class="btn btn-primary btn-seleccionar" data-id="' + cliente.id + '">Seleccionar</button></td>' +
                        '</tr>';
                    $('#tabla-clientes tbody').append(fila);
                });
            } else {
                $('.no-data').show(); // Mostrar la fila de "No hay clientes disponibles"
                swal("No se encontraron clientes");
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

$(document).on('click', '.btn-seleccionar', function (event) {
    event.preventDefault();
    var idCliente = $(this).data('id');
    var clienteSeleccionado = clientesEncontrados.find(function (cliente) {
        return cliente.id === idCliente;
    });

    $(".loading").show();

    $.ajax({
        type: "POST",
        url: "/Factura/ActualizarClienteSelecionado/",
        data: JSON.stringify({ cliente: clienteSeleccionado, idFactura: $("#id-factura").val() }), // Enviar el objeto clienteSeleccionado en el cuerpo de la solicitud
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            $(".loading").hide();

            if (resultado.existeCliente) {
                // Establecer los valores en los campos de entrada correspondientes
                $('#btn-editar').attr('disabled', false);
                $('#id').val(resultado.id);
                $('#id-cliente').val(resultado.identificacion);
                $('#nombre-cliente').val(resultado.nombre);
                $('#direccion-cliente').val(resultado.direccion);
                $('#email-cliente').val(resultado.email);
                $('#celular-cliente').val(resultado.celular);

                // Cerrar el modal
                $('#modalBuscarporNombre').modal('hide');
            } else {
                // Manejar el caso cuando el cliente no existe
                alert("El cliente no existe");
            }
        },
        error: function (xhr, status, error) {
            // Manejar errores de la solicitud AJAX
            alert("Error: " + error);
        }
    });
});



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
        data: { idFactura: $("#id-factura").val() },
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

function CargarAgregarProductoMasivo() {
    $("#vistaAgregarProducto").empty();
    $.ajax({
        type: "GET",
        url: "/Factura/AgregarProductoMasivo/",
        data: { idFactura: $("#id-factura").val() },
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

function BuscarProductoMasivo() {
    $.ajax({
        type: "POST",
        url: "/Factura/AgregarProductoMasivo/",
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

function AgregarProductosMasivo() {
    $.ajax({
        type: "POST",
        url: "/Factura/AgregarProductosMasivoFactura/",
        cache: false,
        data: $("#frm-agregar-producto").serialize(),
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

function ActualizarDetalleFactura(id) {

    var precio = $('#' + id + '-precio').val();
    var qty = $('#' + id + '-qty').val();
    var desc = $('#' + id + '-desc').val();
    var adic = $('#' + id + '-adic').val();

    if (Number(precio) >= 0 && Number(qty) >= 0 && Number(desc) >= 0) {
        $(".loading").show();
        $.ajax({
            type: "POST",
            url: "/Factura/ActualizarDetalle/",
            cache: false,
            data: { id, idFactura: $("#id-factura").val(), nuevoPrecio: precio, nuevacantidad: qty, porcentajeDescuento: desc, adicional: adic },
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

function ActualizarAdicionalDetalle(id, selectObject) {
    return;
    //var adiciona = selectObject.value;
    //if (adiciona !== null && adiciona !== undefined) {
    //    $.ajax({
    //        type: "POST",
    //        url: "/Factura/ActualizarAdicionalDetalle/",
    //        cache: false,
    //        data: { id, idFactura: $("#id-factura").val(), adicional: adiciona },
    //        success: function (result) {
    //            location.reload();
    //        },
    //        failure: function (response) {
    //            alert(response.responseText);
    //            alert("error ");
    //        },
    //        error: function (response) {
    //            alert(response.responseText);
    //        }
    //    });
    //} else {
    //    location.reload();
    //}
}

function ActualizarPrecioDetalle(id, selectObject) {
    return;
    //var precio = selectObject.value;
    //if (Number(precio) > 0) {
    //    $.ajax({
    //        type: "POST",
    //        url: "/Factura/ActualizarPrecioDetalle/",
    //        cache: false,
    //        data: { id, idFactura: $("#id-factura").val(), nuevoPrecio: precio },
    //        success: function (result) {
    //            location.reload();
    //        },
    //        failure: function (response) {
    //            alert(response.responseText);
    //            alert("error ");
    //        },
    //        error: function (response) {
    //            alert(response.responseText);
    //        }
    //    });
    //} else {
    //    location.reload();
    //}
}

function ActualizarCantidadDetalle(id, selectObject) {
    return;
    //var cantidad = selectObject.value;
    //if (Number(cantidad) > 0) {
    //    $.ajax({
    //        type: "POST",
    //        url: "/Factura/ActualizarCantidadDetalle/",
    //        cache: false,
    //        data: { id, idFactura: $("#id-factura").val(), nuevaCantidad: cantidad },
    //        success: function (result) {
    //            location.reload();
    //        },
    //        failure: function (response) {
    //            alert(response.responseText);
    //            alert("error ");
    //        },
    //        error: function (response) {
    //            alert(response.responseText);
    //        }
    //    });
    //} else {
    //    location.reload();
    //}
}

function ActualizarPorcentajeDescuentoDetalle(id, selectObject) {
    return;
    //var porcentaje = selectObject.value;
    //if (Number(porcentaje) >= 0) {
    //    $.ajax({
    //        type: "POST",
    //        url: "/Factura/ActualizarPorcentajeDescuentoDetalle/",
    //        cache: false,
    //        data: { id, idFactura: $("#id-factura").val(), porcentaje: porcentaje },
    //        success: function (result) {
    //            location.reload();
    //        },
    //        failure: function (response) {
    //            alert(response.responseText);
    //            alert("error ");
    //        },
    //        error: function (response) {
    //            alert(response.responseText);
    //        }
    //    });
    //} else {
    //    location.reload();
    //}
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

function RecalcularValores() {
    $.ajax({
        type: "POST",
        url: "/Factura/RecualcularFactura/",
        data: { idFactura: $("#id-factura").val() },
        success: function (datos) {
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

function Anular() {
    $.ajax({
        type: "POST",
        url: "/Factura/AnularFactura/",
        data: { idFactura: $("#id-factura").val() },
        success: function (datos) {
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

function CargarImportarDetalle() {
    $("#vistaAgregarAdicional").empty();
    $.ajax({
        type: "GET",
        url: "/Factura/ImportarDetalle/",
        data: { id: $("#id-factura").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaImportarDetalle").html("");
            $("#vistaImportarDetalle").html(response);
            $("#importarDetalle").appendTo("body").modal("show");
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

function ImportarDetalle() {

    var formElement = document.getElementById("frm-importar-detalle");
    var formData = new FormData(formElement);
    console.log(formData instanceof FormData)

    $.ajax({
        type: "POST",
        url: "/Factura/ImportarDetalle/",
        cache: false,
        data: formData,
        processData: false, // CRITICAL: Prevents jQuery from trying to process the FormData object
        contentType: false,
        success: function (result) {
            if (result.ingresoExitoso !== undefined && result.ingresoExitoso === true) {
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