
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
        $(".loading").show();
        $.ajax({
            type: "GET",
            url: "/Proforma/ObtenerDatosProformaPuntoEmision/",
            data: { id: $('#lista-punto-emision').val() },
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (resultado) {
                $(".loading").hide();
                if (resultado.existenPuntoEmison === true) {
                    $('#numero-proforma').html(resultado.numeroProforma);
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

}

function BuscarConsumidorFinal() {
    $(".loading").show();
    $.ajax({
        type: "GET",
        url: "/Proforma/BuscarConsumidorFinal/",
        data: { idProforma: $("#id-proforma").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (datos) {
            $(".loading").hide();
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
    $(".loading").show();
    $.ajax({
        type: "GET",
        url: "/Proforma/BuscarCliente/",
        data: { identificacion: $('#id-cliente').val(), idProforma: $("#id-proforma").val() },
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            $(".loading").hide();
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

/*BUSCAR POR NOMBRE AL CLIENTE*/
function BuscarClienteByNombre() {
    console.log('AQUI INGRESO AHORA');
    $(".loading").show();

    $.ajax({
        type: "GET",
        url: "/Proforma/BuscarClienteByNombre/"
        data: { nombre: $('#id-cliente-name').val(), idProforma: $("#id-proforma").val() }, // Enviamos el nombre
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (resultado) {
            $(".loading").hide();

            if (resultado.length > 0) { // Si hay clientes coincidentes
                $('#btn-editar').attr('disabled', false);

                // Aquí puedes mostrar una lista de los clientes coincidentes
                // y permitir al usuario seleccionar uno
                var clientesEncontrados = resultado.map(function (cliente) {
                    return cliente.nombre + " (" + cliente.identificacion + ")";
                }).join("<br>");

                swal({
                    title: "Clientes encontrados",
                    html: clientesEncontrados,
                    showCancelButton: true,
                    cancelButtonText: "Cancelar",
                    confirmButtonText: "Seleccionar"
                }).then(function (result) {
                    if (result.isConfirmed) {
                        // El usuario ha seleccionado un cliente
                        var clienteSeleccionado = resultado.find(function (cliente) {
                            return cliente.nombre + " (" + cliente.identificacion + ")" === result.value;
                        });

                        $('#id').val(clienteSeleccionado.id);
                        $('#id-cliente').val(clienteSeleccionado.identificacion);
                        $('#nombre-cliente').val(clienteSeleccionado.nombre);
                        $('#direccion-cliente').val(clienteSeleccionado.direccion);
                        $('#email-cliente').val(clienteSeleccionado.email);
                        $('#celular-cliente').val(clienteSeleccionado.celular);
                    }
                });
            } else {
                $('#btn-editar').attr('disabled', true);
                $('#nombre-cliente').val("");
                $('#direccion-cliente').val("");
                $('#email-cliente').val("");
                $('#celular-cliente').val("");
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


function CargarCrearCliente() {
    $(".loading").show();
    $("#vistaNuevoCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Create/",
        data: { origen: 1 },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $(".loading").hide();
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
    $(".loading").show();
    $("#vistaEditarCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Edit/",
        data: { id: $('#id').val(), origen: 1 },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $(".loading").hide();
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
    $(".loading").show();
    $("#vistaAgregarProducto").empty();
    $.ajax({
        type: "GET",
        url: "/Proforma/AgregarProducto/",
        data: {},
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $(".loading").hide();
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
    $(".loading").show();
    $.ajax({
        type: "POST",
        url: "/Proforma/AgregarProducto/",
        cache: false,
        data: $("#frm-agregar-producto").serialize(),
        success: function (result) {
            $(".loading").hide();
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
    $(".loading").show();
    $.ajax({
        type: "POST",
        url: "/Proforma/AgregarProductoProforma/",
        cache: false,
        data: { id, idProforma: $("#id-proforma").val() },
        success: function (result) {
            $(".loading").hide();
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
        $(".loading").show();
        $.ajax({
            type: "POST",
            url: "/Proforma/ActualizarAdicionalDetalle/",
            cache: false,
            data: { id, idProforma: $("#id-proforma").val(), adicional: adiciona },
            success: function (result) {
                $(".loading").hide();
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
        $(".loading").show();
        $.ajax({
            type: "POST",
            url: "/Proforma/ActualizarPrecioDetalle/",
            cache: false,
            data: { id, idProforma: $("#id-proforma").val(), nuevoPrecio: precio },
            success: function (result) {
                $(".loading").hide();
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
        $(".loading").show();
        $.ajax({
            type: "POST",
            url: "/Proforma/ActualizarCantidadDetalle/",
            cache: false,
            data: { id, idProforma: $("#id-proforma").val(), nuevaCantidad: cantidad },
            success: function (result) {
                $(".loading").hide();
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
        $(".loading").show();
        $.ajax({
            type: "POST",
            url: "/Proforma/ActualizarPorcentajeDescuentoDetalle/",
            cache: false,
            data: { id, idProforma: $("#id-proforma").val(), porcentaje: porcentaje },
            success: function (result) {
                $(".loading").hide();
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

function ActualizarObservaciones(selectObject) {
    var texto = selectOjbect.value;
    $(".loading").show();
    $.ajax({
        type: "POST",
        url: "/Proforma/ActualizarObservaciones/",
        cache: false,
        data: { id: $("#id-proforma").val(), observaciones: texto },
        success: function (result) {
            $(".loading").hide();
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

function EliminarDetalle(id) {
    $(".loading").show();
    $.ajax({
        type: "POST",
        url: "/Proforma/EliminarDetalle/",
        cache: false,
        data: { id, idProforma: $("#id-proforma").val() },
        success: function (result) {
            $(".loading").hide();
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




function EliminarProforma() {
    $(".loading").show();
    $.ajax({
        type: "POST",
        url: "/Proforma/Delete/",
        data: { id: $("#id-proforma").val() },
        success: function (resultado) {
            $(".loading").hide();
            if (resultado.proformaBorrada === true) {
                swal("Proforma Eliminada Correctamente");
                window.location.href = '/Proforma/Index';
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

function Enviar() {
    $(".loading").show();
    $("#btn-enviar").attr('disabled', 'disabled');
    $.ajax({
        type: "POST",
        url: "/Proforma/EnviarProforma/",
        data: { id: $("#id-proforma").val() },
        dataType: "json",
        success: function (response) {
            $(".loading").hide();
            $("#btn-enviar").removeAttr('disabled');
            if (response.enviado === true) {
                swal(response.mensaje);
            } else {
                alert(response.mensaje);
            }

        },
        failure: function (response) {
            $("#btn-enviar").removeAttr('disabled');
            alert(response.responseText);
            alert("error ");
        },
        error: function (response) {
            $("#btn-enviar").removeAttr('disabled');
            alert(response.responseText);
        }
    });
}

function GenerarFactura() {
    $(".loading").show();
    $("#btn-enviar").attr('disabled', 'disabled');
    $.ajax({
        type: "POST",
        url: "/Proforma/EnviarProforma/",
        data: { id: $("#id-proforma").val() },
        dataType: "json",
        success: function (response) {
            $(".loading").hide();
            $("#btn-enviar").removeAttr('disabled');
            if (response.enviado === true) {
                swal(response.mensaje);
            } else {
                alert(response.mensaje);
            }

        },
        failure: function (response) {
            $("#btn-enviar").removeAttr('disabled');
            alert(response.responseText);
            alert("error ");
        },
        error: function (response) {
            $("#btn-enviar").removeAttr('disabled');
            alert(response.responseText);
        }
    });
}

function actualizarDetalle(id, selectObject) {
    this.ActualizarPrecioDetalle(id, selectObject);
    this.ActualizarAdicionalDetalle(id, selectObject)
    this.ActualizarCantidadDetalle(id, selectObject);
    this.ActualizarPorcentajeDescuentoDetalle(id, selectObject);
}