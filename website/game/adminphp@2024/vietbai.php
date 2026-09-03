<?php 
include_once($_SERVER['DOCUMENT_ROOT'] . '/api/config.php');
if(isset($post['post'])){
	//game,img,price,project,noidung,content
	if(!$post['content']){
		echo "<script>alert('Vui lòng nhập đầy đủ thông tin!');location.href='vietbai.php'</script>";
		exit;
	}else{
		$pdo->prepare("INSERT INTO `cms` (`title`, `content`) VALUES (?, ?)")->execute(array($post['title'],$post['content']));
		echo "<script>alert('Đăng bài thành công!');location.href='vietbai.php'</script>";
		exit;
	}
}
if(isset($get['del'])){
	$pdo->prepare("DELETE FROM `cms` WHERE `id` = ?")->execute(array($get['del']));
	echo "<script>alert('Xóa bài thành công!');location.href='vietbai.php'</script>";
}
if(isset($post['sua'])){
	$a=$pdo->prepare("UPDATE `cms` SET `title` = ?,`content` = ? WHERE `id` = ?")->execute(array($post['title'],$post['content'],$post['id']));
	echo "<script>alert('Sửa bài thành công!');location.href='vietbai.php'</script>";
}
if(isset($post['PIN'])){
    $pin = '123456';
    if($post['PIN'] != $pin){
        exit('Mã PIN không đúng');
    }else{
        $_SESSION['admin'] = true;
        echo "<script>alert('login thành công!');location.href='vietbai.php'</script>";
    }
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
	$result = $pdo->query("SELECT * FROM cms WHERE id = '$get[edit]' ")->fetch(PDO::FETCH_ASSOC);
	$btn = '<button name="sua" type="submit" class="btn btn-primary">Sửa</button>';
}else{
	$btn = '<button name="post" type="submit" class="btn btn-primary">Đăng</button>';
}
?>
<div class="container mt-3">
<button class="btn btn-primary mb-3" id="editne" data-bs-toggle="offcanvas" data-bs-target="#thembai">Thêm Bài</button>
<a class="btn btn-primary mb-3" href="./index.php">Quay lại</a>

  <table id="game" class="display" style="width:100%">
        <thead>
            <tr>
                <th>STT</th>
                <th>Tiểu đề</th>
                <th>Hành động</th>
                
            </tr>
        </thead>
        <tbody>
        <?php $i = 1;foreach($getCms as $item){?>    
			<tr>
                <td><?=$item['id']?></td>
                <td><?=$item['title']?></td>
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
			<textarea name="content" style="    height: 500px;" id="editor"><?=$result['content']?></textarea>
		  </div>
		  
		  <?=$btn?>
		  
		</form>
	  </div>
	</div>
	

</div>
<script src="https://codeseven.github.io/toastr/build/toastr.min.js"></script>
<script>
CKEDITOR.replace( 'editor', {
        height: 550
    } );
</script>
<?php
if(isset($get['edit'])){
	echo "<script>$('#editne').click();</script>";
}
?>
</body>
</html>
