
function abrirCarga() {
    $(".loading").show();
}

function IngresarInventario() {
    $(".loading").show();
    $.ajax({
        type: "POST",
        url: "/IngresosBodega/Create/",
        cache: false,
        data: $("#frm-ingreso-bodega").serialize(),
        success: function (result) {
            $(".loading").hide();
            if (result.ingresoExitoso !== undefined && result.ingresoExitoso === true) {
                swal("Ingreso de Existencias", "Ingresado Correctamente");
                window.location.href = "/IngresosBodega";
            } else {
                swal("Error",result.mensaje);
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