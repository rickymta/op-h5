var checknum = '';
var uid = '';
var qu = $('#qu').val();

$('#checknum').change(function() {
	checknum = $(this).val();
});

$('#uid').change(function(){
	uid=$.trim($(this).val());
});

$('#qu').change(function(){
	qu=$.trim($(this).val());
});

function chargebtn() {
	if (checknum == '') {
		layer.msg('请输入GM校验码');
		return false;
	}
	if(uid==''){
		layer.msg('角色名不能为空');
		return false;
	}
	var chargenum=$('#chargenum').val();
	if(chargenum=='' || chargenum<=0){
		layer.msg('请输入充值数量');
		return false;
	}
	var chargetype=$('#chargetype').val();
	if(chargetype==''){
		layer.msg('请选择操作类型');
		return false;
	}
	$.ajaxSetup({
		contentType: "application/x-www-form-urlencoded; charset=utf-8"
	});
	$.post("../gmquery.php", {
			type:'charge',uid:uid,qu:qu,checknum:checknum,chargenum:chargenum,chargetype:chargetype
		},
		function(data) {
			layer.msg(data);
		});
}

function send_mail() {
	if (checknum == '') {
		layer.msg('请输入GM校验码');
		return false;
	}
	if(uid==''){
		layer.msg('角色名不能为空');
		return false;
	}
	var mailid=$('#mailid').val();
	if(mailid==''){
		layer.msg('请选择物品');
		return false;
	}
	var title=$('#title').val();
	if(title==''){
		title='GM邮件';
	}
	var content=$('#content').val();
	if(content==''){
		content='亲爱的玩家，请查收您的邮件!';
	}
	var mailnum=$('#mailnum').val();
	if(mailnum=='' || isNaN(mailnum)){
		layer.msg('数量不能为空');
		return false;
	}
	if(mailnum<1 || mailnum>999999999){
		layer.msg('道具数量范围:1-999999999');
		return false;
	}
	$.ajaxSetup({
		contentType: "application/x-www-form-urlencoded; charset=utf-8"
	});
	$.post("../gmquery.php", {
			type:'mail',uid:uid,item:mailid,num:mailnum,qu:qu,checknum:checknum,title:title,content:content
		},
		function(data) {
			layer.msg(data);

		});
}

function send_allmails() {
	if (checknum == '') {
		layer.msg('请输入GM校验码');
		return false;
	}
	var mailid=$('#mailid').val();
	if(mailid==''){
		layer.msg('请选择物品');
		return false;
	}
	var title=$('#title').val();
	if(title==''){
		title='GM邮件';
	}
	var content=$('#content').val();
	if(content==''){
		content='亲爱的玩家，请查收您的邮件!';
	}
	var mailnum=$('#mailnum').val();
	if(mailnum=='' || isNaN(mailnum)){
		layer.msg('数量不能为空');
		return false;
	}
	if(mailnum<1 || mailnum>999999999){
		layer.msg('道具数量范围:1-999999999');
		return false;
	}
	$.ajaxSetup({
		contentType: "application/x-www-form-urlencoded; charset=utf-8"
	});
	$.post("../gmquery.php", {
			type:'quanfu',uid:uid,item:mailid,num:mailnum,qu:qu,checknum:checknum,title:title,content:content
		},
		function(data) {
			layer.msg(data);
		});
}