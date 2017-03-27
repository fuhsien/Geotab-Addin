var calendar = flatpickr("#from", {
    inline: false
});

$(function(){
    $("#from").change(function(){
        console.log(document.getElementById("from"));
    })
})