function btnNhan() {
  $.ajax({
    url: "./config.php?act=nhan",
    type: "post",
    dataType: "text",
    data: {
      moc: $("#moc").val(),
      role: $("#role").val(),
    },
    success: function (result) {
      if (result == "false") {
        var icon = "error";
        var msg = "Bạn không đủ điều kiện";
      } else {
        var icon = "success";
        var msg = "Nhận vật phẩm thành công";
      }

      Swal.fire({
        position: "center",
        icon: icon,
        html: msg,
        showConfirmButton: false,
        timer: 2000,
      });
      setInterval(function () {
        location.reload();
      }, 2000);
    },
  });
}

function popup(n) {
  $("#mocinput").html(
    '<input class="form-control" readonly id="moc" value="' + n + '" >'
  );
}

$(document).ready(function () {
  $("#selectRole").on("change", function () {
    var selectedValue = $(this).val();
    location.href = "?act=data&data=" + selectedValue;
  });
});

function btnSell() {
  $.ajax({
    url: "./config.php?act=sell",
    type: "post",
    dataType: "text",
    data: {
      num: $("#numSell").val(),
      idDel: $("#idDel").val(),
      roles: $("#roles").val(),
      srvs: $("#srvs").val(),
      realNum: $("#realNum").val(),
    },
    success: function (result) {
      Swal.fire({
        position: "center",
        icon: "info",
        html: result,
        showConfirmButton: false,
        timer: 2000,
      });
      setInterval(function () {
        location.reload();
      }, 2000);
    },
  });

  $('#timeout').css('display','none');

}

function btn10ngay(n) {
  Swal.fire({
    position: "center",
    icon: "warning",
    html: "còn " + n + " ngày sau mới được thu hồi",
    showConfirmButton: false,
    timer: 2000,
  });
  setInterval(function () {
    location.reload();
  }, 2000);
}

function btnBuy() {
  $.ajax({
    url: "./config.php?act=buy",
    type: "post",
    dataType: "text",
    data: {
      idBuy: $('#idBuy').val(),
      getRole: $('#getRole').val(),
    },
    success: function (result) {
      Swal.fire({
        position: "center",
        icon: "info",
        html: result,
        showConfirmButton: false,
        timer: 2000,
      });
      setInterval(function () {
        location.reload();
      }, 2000);
    },
  });

  $('#timeBuy').css('display','none');
}

function btnpopUp(n){
  $("#getidBuy").html('<input type="hidden" readonly value="'+n+'" id="idBuy">');
}

function btnThuhoi(n){
  $.ajax({
    url: "./config.php?act=thuhoi",
    type: "post",
    dataType: "text",
    data: {
      idItem: n
    },
    success: function (result) {
      Swal.fire({
        position: "center",
        icon: "info",
        html: result,
        showConfirmButton: false,
        timer: 2000,
      });
      setInterval(function () {
        location.reload();
      }, 2000);
    },
  });
}

setInterval(function(){
  $('#timeout').html('<button id="timeoutShow" style="display:none" onclick="btnSell()" class="my-3 btn btn-primary">Xác nhận</button>');
  $('#timeoutShow').css('display','block');
},2500);

setInterval(function(){
  $('#timeBuy').html('<button onclick="btnBuy()" id="timeBuyShow" style="display:none" class="my-3 btn btn-primary">Xác nhận</button>');
  $('#timeBuyShow').css('display','block');
},2500);