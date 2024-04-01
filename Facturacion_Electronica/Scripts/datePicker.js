// Forms Demo
// ----------------------------------- 


(function (window, document, $, undefined) {

    $(function () {

        // DATETIMEPICKER
        // ----------------------------------- 
        if ($.fn.datetimepicker) {
            $('.datePickerBasicDate').datetimepicker({
                format: 'YYYY-MM-DD',
                icons: {
                    time: 'fa fa-clock-o',
                    date: 'fa fa-calendar',
                    up: 'fa fa-chevron-up',
                    down: 'fa fa-chevron-down',
                    previous: 'fa fa-chevron-left',
                    next: 'fa fa-chevron-right',
                    today: 'fa fa-crosshairs',
                    clear: 'fa fa-trash'
                }
            });
            // only time
            $('#datetimepicker2').datetimepicker({
                format: 'LT'
            });
            // View mode
            $('#datetimepicker3').datetimepicker({
                viewMode: 'years',
                format: 'MM/YYYY'
            });
        }

    });

})(window, document, window.jQuery);