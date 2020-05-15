const typedTextSpan = document.querySelector(".typed-text");

const textArray = [
                     "print(\"Hello World!\")"
                   , "System.out.println(\"Hello World!\");"
                   , "printf(\"Hello World!\");"
                   , "<h1>Hello World!</h1>"
                  ]
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
