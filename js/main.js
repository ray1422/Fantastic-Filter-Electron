const FF_DEFAULT_TITLE = "幻想濾鏡 Fantastic Filter";
const remote = require('electron').remote;
const { Menu, MenuItem } = remote;
const fs = require('fs');
const storage = require('electron-localstorage');
var ipc = require("electron").ipcRenderer;

let imagePath, modelPath;
let enhanced = false;
let models = [];
$(document).ready(function () {

    loadSettings();
    const menu = new Menu()
    menu.append(new MenuItem({ label: '複製', click() { console.log('TODO: copy image') } }))
    menu.append(new MenuItem({ label: '貼上', click() { console.log('TODO: copy image') } }))
    menu.append(new MenuItem({ label: '設定', click() { openSetting() } }))

    $(window).contextmenu((e) => {
        e.preventDefault();
        menu.popup({ window: remote.getCurrentWindow() })
    })

    fs.readdir("./pretrained/", (err, files) => {
        files.forEach(file => {
            if (!(file[file.length - 1] == 'b' && file[file.length - 2] == 'p' && file[file.length - 3] == '.')) return;
            var modelPath = "./pretrained/" + file;
            $("#model").append($('<option>', { value: modelPath, text: file.replace('.pb', '') }))
        });
        $("#model").append($('<option>', { value: 'OPEN_OTHER', text: '選擇其他模型..' }))
    });
    let originHeight = 1080;
    let originWidth = 1920;
    let previewHeight = $("#preview_wrapper").innerHeight() - 45;
    let previewWidth = $("#preview_wrapper").innerWidth() - 10;
    function setBG() {
        $("#model_wrapper button").removeClass("btn-light").addClass("btn-dark");
        if (!$("#model_wrapper button").lnegth > 0) setTimeout(() => {
            setBG();
        }, 0)
    }
    setBG();
    $("#open_image").click(function () {
        enhanced = false;
        $("#enhanced_image_wrapper img").css("opacity", 0);
        openFile("請選擇一張圖片..", [
            { name: '照片', extensions: ['jpg', 'png', 'gif'] }
        ], function (filePath) {
            console.log("open image: " + filePath);
            var originImage = new Image();

            originImage.onload = function () {
                originHeight = originImage.height;
                originWidth = originImage.width;
                $("#origin_image_wrapper img").attr("src", originImage.src);
                updateSize();
                console.log({ height: originHeight, width: originWidth });
            }
            originImage.src = filePath;
            imagePath = filePath;
        });
    });
    $("#model").change(function () {
        modelPath = $("#model :selected").val();
        if (modelPath == 'OPEN_OTHER') {
            openFile("請選擇模型..", [{ name: '預訓練模型', extensions: ['*.pb'] }],
                function (localModelPath) {
                    modelPath = localModelPath;
                    loadModel(modelPath);
                },
                function () {
                    $("#model").val($('.selectpicker option:nth(0)').val());
                    $('.selectpicker').selectpicker('refresh');
                })
        }
        else if (modelPath) {
            loadModel(modelPath);
        }
    });
    $("#run").click(function () {
        $("#image_enhancing_animation").animate({
            opacity: 1
        }, 500)
        // c++ hook.
        enhanced = true;
        setTimeout(() => {
            const doneNotification = new Notification('處理完成！', {
                body: '你的圖片已經成功增強囉～',
                icon: 'images/favicon.png',
                requireInteraction: true
            })
            //TODO: sound.

            $("#image_enhancing_animation").animate({
                opacity: 0
            }, 500)
            $("#enhanced_image_wrapper img").animate({
                opacity: 1
            }, 500)
            setTimeout(() => {
                doneNotification.close()
            }, 5000);

            // TODO: update image. the following would be remove and replace with the real c++ hook

            $("#enhanced_image_wrapper img").attr('src', $("#origin_image_wrapper img").attr('src'));


        }, 5000);
    });

    function openSetting() {
        $("#settings").modal('show');
    }

    function updateSetting(item, value) {

        console.log(item + ': ' + value)
        storage.setItem('setting_' + item, value)
        switch (item) {
            case 'system_border':
                if (value) {
                    $("#window_wrapper").css({
                        'borderRadius': 0,
                        'paddingBottom': $("#titlebar").outerHeight() / 5 * 4,
                        'paddingTop': $("#titlebar").outerHeight() / 5,
                    })
                    $("#titlebar").hide();
                }
                break;
        }
    }
    function loadSettings() {
        const settingFlags = [
            'system_border',
        ]
        settingFlags.forEach(settingOrg => {
            setting = s(settingOrg);
            var settingVal = storage.getItem(setting);
            var $elem = $("#" + setting);

            if (settingVal != null) {
                updateSetting(settingOrg, settingVal);
                switch ($elem.attr('type')) {
                    case 'checkbox':
                        $("#" + setting).attr("checked", settingVal == true);
                        break;
                    default:
                        $("#" + setting).val(settingVal);
                }
                $elem.change(function () {
                    switch ($elem.attr('type')) {
                        case 'checkbox':
                            updateSetting(settingOrg, $(this).is(":checked") == true);
                            break;
                        default:
                            updateSetting(settingOrg, $(this).val());
                    }

                })
            }
        });
        function s(a) {
            return 'setting_' + a;
        }
    }

    $("#save").click(function () {
        if (!enhanced) {
            eModal.alert('請先增強圖片！', 'Hmm..');
            return;
        }
        remote.dialog.showSaveDialog({
            title: "儲存檔案",
            filters: [
                { name: 'PNG image', extensions: ['png'] },
                { name: 'JPEG image', extensions: ['jpg'] }
            ]
        }, function (filePath) {
            if (filePath == undefined) return;
            if (getFileExtension(filePath) != 'jpg' || getFileExtension(filePath) != 'png') {
                filePath += '.png';
            }
            alert("TODO SAVE: " + filePath)
        })
        function getFileExtension(filename) {
            return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
        }
    })

    $("#enhanced_image_wrapper img").mousedown(function () {
        if (!enhanced) return;
        $(this).animate({
            opacity: 0
        }, 200);
    });
    $("#enhanced_image_wrapper img").mouseup(function () {
        if (!enhanced) return;
        $(this).animate({
            opacity: 1
        }, 200);
    });
    $("#enhanced_image_wrapper img").mouseout(() => { $("#enhanced_image_wrapper img").mouseup() })

    $("#win_min").click(function () {
        remote.getCurrentWindow().minimize();
    });

    $("#win_max").click(function () {
        let window = remote.getCurrentWindow();
        window.isMaximized() ? window.unmaximize() : window.maximize();
    });

    $("#win_close").click(function () {
        remote.getCurrentWindow().close();
    });

    function updateSize() {
        $("#preview_wrapper").outerHeight(
            $("#main_wrapper").innerHeight() - $("#toolbar_wrapper").outerHeight() - 2
        );
        previewHeight = $("#preview_wrapper").innerHeight() - 45;
        previewWidth = $("#preview_wrapper").innerWidth() - $("#preview_wrapper").css("paddingLeft").replace(/[^-\d\.]/g, '') - $("#preview_wrapper").css("paddingRight").replace(/[^-\d\.]/g, '') - 10;
        let newWidth, newHeight;
        if ((previewHeight / originHeight) > (previewWidth / originWidth)) {
            //看橫的
            newWidth = previewWidth;
            newHeight = ~~(originHeight * previewWidth / originWidth);
        }
        else {
            newHeight = previewHeight;
            newWidth = ~~(originWidth * previewHeight / originHeight);
        }
        $(".image_preview img, #image_enhancing_animation").css({
            height: newHeight,
            width: newWidth,
        });
        $(".image_preview:nth(1) img, #image_enhancing_animation").css({
            position: "absolute",
            top: $(".image_preview:nth(0) img").offset().top - $("#preview_wrapper").offset().top,
            left: $(".image_preview:nth(0) img").offset().left// - $("#preview_wrapper").offset().left
        })
        $("#peek_origin_tips").css({
            top: $(".image_preview:nth(0) img").offset().top - $("#preview_wrapper").offset().top + 5,
            right: $("#preview_wrapper").outerWidth() - $(".image_preview:nth(0) img").width() - $(".image_preview:nth(0) img").offset().left + 5
        })
        setTimeout(updateSize, 100) // something it would be buggy, so that call it itself to make sure all the element can be place correctly.
    }
    updateSize();
    $(window).resize(updateSize)
})



function openFile(title, filters, callback, failCallback) {
    remote.dialog.showOpenDialog({
        title: title,
        filters: filters
    }, function (filePaths) {
        if (filePaths == undefined) if (failCallback != undefined) return failCallback(); else return;
        callback(filePaths);
    })
}

function loadModel(modelPath) {
    console.log("model: " + modelPath);
    eModal.alert(
        {
            message: '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"></div></div>',
            title: "載入模型中..",
            size: 'sm',
            useBin: false,

            buttons: []
        });
    setTimeout(_ => {
        //callback
        eModal.close();
    }, 5000);

}

function setWindowTitle(title) {
    if (!title || title == undefined) {
        title = FF_DEFAULT_TITLE;
    }
    $("#window_title").text(title);
}