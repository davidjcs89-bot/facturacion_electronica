$(document).ready(function () {
    $("#nuevoCliente").click(function () {
        CargarVistaCrearCliente();
    });
});


function CargarVistaCrearCliente() {
    $("#vistaNuevoCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Create/",
        data: { origen:0 },
        contentType: "application/json; charset=utf-8",
        dataType: "html",
        success: function (response) {
            $("#vistaNuevoCliente").html("");
            $("#vistaNuevoCliente").html(response);
            $("#nuevoCliete").appendTo("body").modal("show");
            validarTipoIdentificacion();
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

function CrearCliente() {
    $.ajax({
        type: "POST",
        url: "/Cliente/Create/",
        cache: false,
        data: $("#frm-nuevo-cliente").serialize(),
        success: function (result) {
            if (result.clienteCreado !== undefined && result.clienteCreado === true) {  
                $("#nuevoCliete").modal("hide");
                if (result.origen === 1 || result.origen === 2 || result.origen === 4) {//desde factura - retencion - guia remision
                    $('#id-cliente').val(result.identificacion);
                    $('#btn-buscar').click();
                } else {
                    $('#BuscarTodos').prop('checked', false);
                    $("#buscar-id").val(result.identificacion);
                    $('#btn-buscar').click();
                    $("#buscar-nombre").val("");
                }

            } else {
                $("#vistaNuevoCliente").html("");
                $("#vistaNuevoCliente").html(result);
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

function CargarVistaEditarCliente(idCliente) {
    $("#vistaEditarCliente").empty();
    $.ajax({
        type: "GET",
        url: "/Cliente/Edit/",
        data: { id: idCliente , origen:0},
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

function EditarCliente() {
    $.ajax({
        type: "POST",
        url: "/Cliente/Edit/",
        cache: false,
        data: $("#frm-editar-cliente").serialize(),
        success: function (result) {
            if (result.clienteActualizado !== undefined && result.clienteActualizado === true) {
                $("#editarCliete").modal("hide");
                if (result.origen === 1 || result.origen === 2 || result.origen === 4) {//desde factura - retencion - guia remision
                    $('#id-cliente').val(result.identificacion);
                    $('#btn-buscar').click();
                } else {
                    $('#BuscarTodos').prop('checked', false);
                    $("#buscar-id").val(result.identificacion);
                    $('#btn-buscar').click();
                    $("#buscar-nombre").val("");
                }                
            } else {
                $("#vistaEditarCliente").html("");
                $("#vistaEditarCliente").html(result);
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

function validarTipoIdentificacion() {
    var tipoIdentificacionDropdown = document.getElementById("tipoIdentificacionDropdown");
    var cedulaValue = "2";
    var numeroIdentificacionInput = document.getElementById("numeroIdentificacionInput");
    var numeroIdentificacionError = document.getElementById("numeroIdentificacionError");

    if (tipoIdentificacionDropdown.value === cedulaValue) {
        numeroIdentificacionInput.addEventListener("input", validarNumeroIdentificacion);
        numeroIdentificacionError.textContent = "PARA LA CÉDULA SOLO PUEDE INGRESAR 10 DÍGITOS NUMÉRICOS";
    } else {
        numeroIdentificacionError.textContent = "";
    }
}

function validarNumeroIdentificacion() {
    var cedulaValue = "2";
    var numeroIdentificacionInput = document.getElementById("numeroIdentificacionInput");
    var tipoIdentificacionDropdown = document.getElementById("tipoIdentificacionDropdown");
    var regex = /^\d{10}$/;

    if (tipoIdentificacionDropdown.value === cedulaValue) {
        if (!regex.test(numeroIdentificacionInput.value)) {
            // Eliminar cualquier carácter que no sea un dígito
            numeroIdentificacionInput.value = numeroIdentificacionInput.value.replace(/\D/g, '').slice(0, 10);
        }
    }
}