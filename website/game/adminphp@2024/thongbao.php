<?php
session_start();
$pdo = new PDO("mysql:host=127.0.0.1;dbname=tcg","root","__MYSQL_ROOT_PASSWORD__");
$pdo->exec('set names utf8');
$get = $_GET;
$post = $_POST;
$getfilter="'|(and|or)\\b.+?(>|<|=|in|like)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$postfilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
$cookiefilter="\\b(and|or)\\b.{1,6}?(=|>|<|\\bin\\b|\\blike\\b)|\\/\\*.+?\\*\\/|<\\s*script\\b|\\bEXEC\\b|UNION.+?SELECT|UPDATE.+?SET|INSERT\\s+INTO.+?VALUES|(SELECT|DELETE).+?FROM|(CREATE|ALTER|DROP|TRUNCATE)\\s+(TABLE|DATABASE)";
function StopAttack($StrFiltKey,$StrFiltValue,$ArrFiltReq){
	if(is_array($StrFiltValue)){
		$StrFiltValue=implode($StrFiltValue);
	}
	if (preg_match("/".$ArrFiltReq."/is",$StrFiltValue)==1){
		exit('Hack gì đấy');
	}
}
foreach($_GET as $key=>$value){
	StopAttack($key,$value,$getfilter);
}
foreach($_POST as $key=>$value){
	StopAttack($key,$value,$postfilter);
}
foreach($_COOKIE as $key=>$value){
	StopAttack($key,$value,$cookiefilter);
}
if(isset($post['post'])){
	//game,img,price,project,noidung,content
	if(!$post['content']){
		echo "<script>alert('Vui lòng nhập đầy đủ thông tin!');location.href='thongbao.php'</script>";
		exit;
	}else{
		$pdo->prepare("INSERT INTO `gm_announce` (`title`, `content`) VALUES (?, ?)")->execute(array($post['title'],$post['content']));
		echo "<script>alert('Đăng bài thành công!');location.href='thongbao.php'</script>";
		exit;
	}
}
if(isset($get['del'])){
	$pdo->prepare("DELETE FROM `gm_announce` WHERE `id` = ?")->execute(array($get['del']));
	echo "<script>alert('Xóa bài thành công!');location.href='thongbao.php'</script>";
}
if(isset($post['sua'])){
	$a=$pdo->prepare("UPDATE `gm_announce` SET `title` = ?,`content` = ? WHERE `id` = ?")->execute(array($post['title'],$post['content'],$post['id']));
	echo "<script>alert('Sửa bài thành công!');location.href='thongbao.php'</script>";
}
$getthongbao = $pdo->query("Select * from gm_announce order by id desc")->fetchAll();
if(isset($get['view'])){
    $view = $pdo->query("Select * from gm_announce where id = {$get['view']} ")->fetch();
    $title = $view['title'];
    $content = $view['content'];
    $time = date("d-m-Y H:m:i", strtotime($view['time']));
}
switch ($get['act']) {
    case 'post':
        $title = $post['title'];
        $content = $post['content'];
        if(!$title || !$content){
            exit('Vui lòng nhập đầy đủ thông tin');
        }else{
            $pdo->prepare("INSERT INTO `gm_announce` (`title`, `content`) VALUES (?, ?)")->execute(array($title, $content));
            exit('true');
        }
    break;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Admin</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.datatables.net/1.12.1/css/jquery.dataTables.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://code.jquery.com/jquery-3.5.1.js"></script>
  <script src="https://cdn.datatables.net/1.12.1/js/jquery.dataTables.min.js"></script>
  <script src="//cdn.ckeditor.com/4.19.0/full/ckeditor.js"></script>
  <link rel="stylesheet" href="https://codeseven.github.io/toastr/build/toastr.min.css" id="theme-styles">
  <script>
	$(document).ready(function () {
		$('#game').DataTable();
	});
  </script>
</head>
<body>
<?php
if(!$_SESSION['admin']){
    
    echo '
    <div class="container text-center my-5">
    <form method="POST" action="">
        <input type="password" name="PIN" placeholder="Nhập PIN" required class="form-control mb-3" />
        <button class="btn btn-primary">Login</button>
    </form>
    </div>
    ';
    exit;
}
?>
    
<style>
.offcanvas{
	height: 100% !important;
}
.offcanvas-header{
	background: #e9ecef !important;
}
</style>
<?php
if(isset($get['edit'])){
	$result = $pdo->query("SELECT * FROM gm_announce WHERE id = '$get[edit]' ")->fetch(PDO::FETCH_ASSOC);
	$btn = '<button name="sua" type="submit" class="btn btn-primary">Sửa</button>';
}else{
	$btn = '<button name="post" type="submit" class="btn btn-primary">Đăng</button>';
}
?>
<div class="container mt-3">
<button class="btn btn-primary mb-3" hidden="" id="editne" data-bs-toggle="offcanvas" data-bs-target="#thembai">Thêm Bài</button>
<a class="btn btn-primary mb-3" href="./index.php">Quay lại</a>

  <table id="game" class="display" style="width:100%">
        <thead>
            <tr>
                <th>STT</th>
                <th>Tiểu đề</th>
                <th>Game id</th>
                <th>Hành động</th>
                
            </tr>
        </thead>
        <tbody>
        <?php $i = 1;foreach($getthongbao as $item){?>    
			<tr>
                <td><?=$item['id']?></td>
                <td><?=$item['title']?></td>
                <td><?=$item['game_id']?></td>
                <td><a class="badge bg-danger" onclick="return confirm('Bạn chắc chắn muốn xóa?')" href="?del=<?=$item['id']?>">Xóa</a> <a class="badge bg-success" href="?edit=<?=$item['id']?>">Sửa</a></td>
            </tr>
		<?php } ?>	
		</tbody>
	</table>
	<div class="offcanvas offcanvas-bottom text-center" id="thembai">
	  <div class="offcanvas-header">
		<button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
	  </div>
	  <div class="offcanvas-body">
		<form action="" method="POST">
		  <div class="mb-3 mt-3">
			<label for="text" class="form-label">Tên đề:</label>
			<input type="text" class="form-control" placeholder="Tiêu đề" value="<?=$result['title']?>" name="title" required>
			<input type="hidden" value="<?=$get['edit']?>" name="id">
		  </div>
		  <div class="mb-3">
			<label for="text" class="form-label">Nội dung :</label>
			<textarea class="form-control" style="height: 500px;" name="content"><?=$result['content']?></textarea>
		  </div>
		  
		  <?=$btn?>
		  
		</form>
	  </div>
	</div>
	

</div>
<script src="https://codeseven.github.io/toastr/build/toastr.min.js"></script>
<?php
if(isset($get['edit'])){
	echo "<script>$('#editne').click();</script>";
}
?>
</body>
</html>
