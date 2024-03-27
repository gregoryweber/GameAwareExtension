import { createDialogueChoiceSvg } from "./updateSvg.js";
var langSelectText = "";
function translateText(text, target) {
  const source = 'en';
  const encodedText = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&ie=UTF-8&oe=UTF-8&otf=2&q=${encodedText}`;

  return fetch(url)
    .then(response => response.json())
    .then(result => {
      let translatedText = '';
      for (let i = 0; i < result[0].length; i++) {
        translatedText += result[0][i][0];
      }
      return translatedText.trim();
    })
    .catch(error => console.error(error));
}

var langTarget = "en";
function changeLanguage(){
  console.log("change language");
  var languageSelect = document.getElementById("language-select");
  langTarget = languageSelect.value;

  // Call translateText to update the translated text
  translateText(dialogArray[dialogArrayIndex].dialogFull, langTarget)
    .then((translatedText) => {
      langSelectText = translatedText;
    })
    .catch((error) => {
      console.error(error);
    });
  
    createDialogueChoiceSvg();

}


export { changeLanguage, translateText}