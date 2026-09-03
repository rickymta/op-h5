$(document).ready(function () {

  $("#nhapcode").click(function (e) {
    e.preventDefault();
    gtag('event', 'header-nhapcode', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#huongdan").click(function (e) {
    e.preventDefault();
    gtag('event', 'header-huongdan', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#napthe").click(function (e) {
    e.preventDefault();
    gtag('event', 'header-napthe', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#gialap").click(function (e) {
    e.preventDefault();
    gtag('event', 'header-gialap', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#apk").click(function (e) {
    e.preventDefault();
    gtag('event', 'header-apk', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#ios").click(function (e) {
    e.preventDefault();
    gtag('event', 'header-ios', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#android").click(function (e) {
    e.preventDefault();
    gtag('event', 'header-android', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#apkFloatingRightBar").click(function (e) {
    e.preventDefault();
    gtag('event', 'floating-right-apk', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#iosFloatingRightBar").click(function (e) {
    e.preventDefault();
    gtag('event', 'floating-right-ios', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#androidFloatingRightBar").click(function (e) {
    e.preventDefault();
    gtag('event', 'floating-right-android', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#huongdanFloatingRightBar").click(function (e) {
    e.preventDefault();
    gtag('event', 'floating-right-huongdan', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#btnNhanCode").click(function (e) {
    e.preventDefault();
    gtag('event', 'btn-nhan-code', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#mobileDownload").click(function (e) {
    e.preventDefault();
    gtag('event', 'mobile-btn-download', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })

  $("#mobileNapThe").click(function (e) {
    e.preventDefault();
    gtag('event', 'mobile-btn-nap-the', {
      'value': 1
    });
    url = $(this).attr('href');
    window.open(url, '_blank');
  })
});