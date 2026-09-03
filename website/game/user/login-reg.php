<div class="content-wrapper luna-new-year" id="f-content">
                <h1 style="font-size:0">langtukids</h1>
                <div class="gc-box-btn-top">
                    <div role="presentation" class="button-df active" form="login-form"><a href="#">Đăng nhập</a></div>
                    <div role="presentation" class="button-df" form="reg-form"><a href="#">Đăng ký</a></div>
                    <!--<div role="presentation" class="button-df" form="re-form"><a href="#">Quên mật khẩu</a></div>-->
                </div>
                <div class="form-get-gc fixBox">
                    <div class="form-div" id="login-form">
                        <form action="/user-mlogin">
                            <div class="input-elm input-code-wrapper">
                                <span>Tài khoản:</span>
                                <input type="text" class="input-code" name="username" placeholder="Nhập tài khoản" value="">
                            </div>

                            <div class="input-elm input-code-wrapper">
                                <span>Mật khẩu:</span>
                                <input type="password" class="input-code" name="password" placeholder="Nhập mật khẩu" value="">
                            </div>

                            <div class="input-elm">
                                <button type="submit" class="fun-btn-v3 fluid lg active">Đăng nhập</button>
                            </div>
                        </form>
							<div class="login-socials">
										<div class="form-group text-center">
											<div class="txt-sub">Hoặc đăng nhập bằng</div>
											<div class="list-type">
												<a href="https://oauth.mongcuuthien.com/fb_oauth" class="type-item icon_fb"></a>
												<a href="https://oauth.mongcuuthien.com/gg_oauth" class="type-item icon_gg"></a>
											</div>
										</div>
							</div>
                    </div>
                    <div class="form-div" id="reg-form" style="display: none;">
                        <form action="/user-mreg">
                            <input type="hidden" value="web" name="ref" />
                            <div class="input-elm input-code-wrapper">
                                <span>Tài khoản:</span>
                                <input type="text" class="input-code" name="username" placeholder="Nhập tài khoản" value="">
                            </div>

                            <div class="input-elm input-code-wrapper">
                                <span>Mật khẩu:</span>
                                <input type="password" class="input-code" name="password" placeholder="Nhập mật khẩu" value="">
                            </div>

                            <div class="input-elm input-code-wrapper">
                                <span>Nhập lại mật khẩu:</span>
                                <input type="password" class="input-code" name="repassword" placeholder="Nhập lại mật khẩu" value="">
                            </div>

                            <div class="input-elm input-code-wrapper">
                                <span>Email:</span>
                                <input type="text" class="input-code" name="email" placeholder="Nhập địa chỉ email" value="">
                            </div>

                            <div class="input-elm">
                                <button type="submit" class="fun-btn-v3 fluid lg active">Đăng ký</button>
                            </div>
                        </form>
                    </div>
                    <div class="form-div" id="re-form" style="display:none">
                        <form action="/user/quenmatkhau.php">
                            <div class="input-elm input-code-wrapper">
                                <span>Tài khoản:</span>
                                <input type="text" class="input-code" name="username" placeholder="Nhập tài khoản" value="">
                            </div>

                            <div class="input-elm input-code-wrapper">
                                <span>Email:</span>
                                <input type="email" class="input-code" name="email" placeholder="Nhập địa chỉ email" value="">
                            </div>

                            <div class="input-elm">
                                <button type="submit" class="fun-btn-v3 fluid lg active">Tìm Mật Khẩu</button>
                            </div>
                        </form>
                        <div class="box-note" style="padding: 0px;">
                            <p style="font-weight: 600;color:red;">Lưu Ý: Chỉ tài khoản đã kích hoạt email, mới tìm được mật khẩu.</p>
                        </div>
                    </div>
                </div>
            </div>