

<button class="fun-btn-v3 sm short" style="border: solid 1px red; color: red;" onclick="btnNhanxu()">Nhận xu</button>

<script>
function btnNhanxu(){
var reLoad = setInterval(function(){location.reload()},2000);
$.get("/act-nhanxu", function(data){
    var result = JSON.parse(data);
    if(result.status == "1"){
        Swal.fire({
        icon: 'success',
        title: 'HL3D',
        text: result.msg,
        showCancelButton: false
        }).reLoad
    }else{
        Swal.fire({
        icon: 'error',
        title: 'HL3D',
        text: result.msg,
        showCancelButton: false
        }).reLoad
    }

  });
}
</script>
