$(document).ready(function () {
    $('#member').DataTable();
});
$(document).ready(function () {
    $('#gift').DataTable();
});
$(document).ready(function () {
    $('#logbank1').DataTable();
});
$(document).ready(function () {
    $('#logthe1').DataTable();
});
$(document).ready(function () {
    $('#logrut1').DataTable();
});
$(document).ready(function () {
    $('#loggiftcode1').DataTable();
});
function btnLogin() {
    $('#err_msg').css('display', 'block');
    $('#err_msg').html('Đang kiếm tra, vui lòng chờ...<img src="https://i.imgur.com/gQ4n7VT.gif" style="width: 16px;height: 16px;"/>');
    $.ajax({                    
        url: "./db.php?act=login",
            type: "post",
            dateType: "text",
            data: {
            username: $('#username').val(),
			password: $('#password').val(),                 
        },
            success: function(result) {                        
           if(result == 'true'){
               $('#err_msg').addClass('text-success').removeClass('text-danger');
               $('#err_msg').html('đăng nhập thành công');
               setInterval(function(){location.reload()},2000);
           }else{
                $('#err_msg').addClass('text-danger').removeClass('text-success');
                $('#err_msg').html(result);
           }
        }
});            
}		
function btnXu() {
    $('#xu_msg').css('display', 'block');
    $('#xu_msg').html('Đang kiếm tra, vui lòng chờ...<img src="https://i.imgur.com/gQ4n7VT.gif" style="width: 16px;height: 16px;"/>');
    $.ajax({                    
        url: "./db.php?act=xu",
            type: "post",
            dateType: "text",
            data: {
            username: $('#user').val(),
			xu: $('#xu').val(),                 
        },
            success: function(result) {                        
           if(result == 'true'){
               $('#xu_msg').addClass('text-success').removeClass('text-danger');
               $('#xu_msg').html('Add xu nhập thành công');
               setInterval(function(){location.reload()},2000);
           }else{
                $('#xu_msg').addClass('text-danger').removeClass('text-success');
                $('#xu_msg').html(result);
           }
        }
});            
}	
function btnXu2() {
    $('#xu_msg123').css('display', 'block');
    $('#xu_msg123').html('Đang kiếm tra, vui lòng chờ...<img src="https://i.imgur.com/gQ4n7VT.gif" style="width: 16px;height: 16px;"/>');
    $.ajax({                    
        url: "./db.php?act=xusk",
            type: "post",
            dateType: "text",
            data: {
            username: $('#user2').val(),
			xu: $('#xu2').val(),                 
        },
            success: function(result) {                        
           if(result == 'true'){
               $('#xu_msg123').addClass('text-success').removeClass('text-danger');
               $('#xu_msg123').html('Add sk nhập thành công');
               setInterval(function(){location.reload()},2000);
           }else{
                $('#xu_msg123').addClass('text-danger').removeClass('text-success');
                $('#xu_msg123').html(result);
           }
        }
});            
}
function btnAddcode() {
    $('#code_msg').css('display', 'block');
    $('#code_msg').html('Đang kiếm tra, vui lòng chờ...<img src="https://i.imgur.com/gQ4n7VT.gif" style="width: 16px;height: 16px;"/>');
    $.ajax({                    
        url: "./db.php?act=code",
            type: "post",
            dateType: "text",
            data: {
            code: $('#code').val(),
			item: $('#item').val(),     
			loaicode: $('#loaicode').val(), 
        },
            success: function(result) {                        
           if(result == 'true'){
               $('#code_msg').addClass('text-success').removeClass('text-danger');
               $('#code_msg').html('Add code thành công');
               setInterval(function(){location.reload()},2000);
           }else{
                $('#code_msg').addClass('text-danger').removeClass('text-success');
                $('#code_msg').html(result);
           }
        }
});            
}

function btnEditcode() {
    $('#edit_msg').css('display', 'block');
    $('#edit_msg').html('Đang kiếm tra, vui lòng chờ...<img src="https://i.imgur.com/gQ4n7VT.gif" style="width: 16px;height: 16px;"/>');
    $.ajax({                    
        url: "./db.php?act=edit",
            type: "post",
            dateType: "text",
            data: {
            code: $('#code1').val(),
			item: $('#item1').val(),     
			loaicode: $('#loaicode1').val(), 
			idcode: $('#idcode').val(), 
        },
            success: function(result) {                        
           if(result == 'true'){
               $('#edit_msg').addClass('text-success').removeClass('text-danger');
               $('#edit_msg').html('sửa code thành công');
               setInterval(function(){location.reload()},2000);
           }else{
                $('#edit_msg').addClass('text-danger').removeClass('text-success');
                $('#edit_msg').html(result);
           }
        }
});            
}

function del(n) {
     $.get("./db.php?act=del&id="+n, function(data, status){
        alert('Xóa thành công');location.reload();
      });
}


