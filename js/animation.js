const typedTextSpan = document.querySelector(".typed-text");

const textArray = ["Hello World!","Bonjour","안녕하세요","你好","こんにちは","Hola","สวัสดี"];
const typingDelay = 200;
const erasingDelay = 100;
const newTextDelay = 2000;
let textArrayIndex = 0;
let charIndex = 0;

function type() {
    if (charIndex < textArray[textArrayIndex].length) {
        //type
        typedTextSpan.textContent += textArray[textArrayIndex].charAt(charIndex);
        charIndex++;
        setTimeout(type, typingDelay);
    } else {
        //erase
        setTimeout(erase,newTextDelay);
    }
}

function erase() {
    if (charIndex > 0) {
        typedTextSpan.textContent = textArray[textArrayIndex].substring(0,charIndex-1);
        charIndex--;
        setTimeout(erase,erasingDelay);
    } else {
        //type
        textArrayIndex++;
        if (textArrayIndex >= textArray.length) textArrayIndex=0;
        setTimeout(type,typingDelay + 1100);
    }
}

type();
