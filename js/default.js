var calendar = flatpickr("input", {
    inline: false
});

function openCalendar(){
    setTimeout(function(){
        calendar.open();
    }, 0);
}