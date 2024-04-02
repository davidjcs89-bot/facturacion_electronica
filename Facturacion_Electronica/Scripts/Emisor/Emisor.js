
$(document).ready(function () {

    if ($("#ContirbuyenteEspecial").is(":checked")) // Si la checkbox de mostrar contraseña está activada
    {
        $("#txt-num-ctr-especial").prop("disabled", false);
    }
    else // Si no está activada
    {
        $("#txt-num-ctr-especial").prop("disabled", true);
    }

    $("#ContirbuyenteEspecial").change(function () {

        if ($("#ContirbuyenteEspecial").is(":checked")) // Si la checkbox de mostrar contraseña está activada
        {
            $("#txt-num-ctr-especial").prop("disabled", false);
        }
        else // Si no está activada
        {
            $("#txt-num-ctr-especial").prop("disabled", true);
        }
    });
});
