$(document).ready(function () {
    GetConfigImpresionComprobante($("#lista-documentos").val());

    $('#lista-documentos').change(function () {
        GetConfigImpresionComprobante($("#lista-documentos").val());
    });
});


function GetConfigImpresionComprobante(id) {
    $.ajax({
        type: "GET",
        url: "/Impresion/GetConfigImpresionComprobante/",
        dataType: "json",
        data: { id },
        success: function (response) {
            $("#Firma").prop('checked', response.firma);
            $("#mensajes").val(response.mensajes);
        },
        error: function (response) {
            alert(response.responseText);
        }
    });
}