var calendar = flatpickr("#from", {
    inline: false
});

$(function(){
    $("#from").change(function(){
        console.log(calender);
    })
})