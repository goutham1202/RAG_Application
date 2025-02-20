const scrollers = document.querySelectorAll(".scroller");

// If a user hasn't opted in for recuded motion, then we add the animation
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  addAnimation();
}

function addAnimation() {
  scrollers.forEach((scroller) => {
    // add data-animated="true" to every `.scroller` on the page
    scroller.setAttribute("data-animated", true);

    // Make an array from the elements within `.scroller-inner`
    const scrollerInner = scroller.querySelector(".scroller__inner");
    const scrollerContent = Array.from(scrollerInner.children);

    // For each item in the array, clone it
    // add aria-hidden to it
    // add it into the `.scroller-inner`
    scrollerContent.forEach((item) => {
      const duplicatedItem = item.cloneNode(true);
      duplicatedItem.setAttribute("aria-hidden", true);
      scrollerInner.appendChild(duplicatedItem);
    });
  });
}

const kannadaButton = document.getElementById("kan");
const englishButton = document.getElementById("eng");
const lang = document.getElementById("lang");
const lang2 = document.getElementById("lang2");

function changeContentKan()
{
  lang.innerHTML = " ಸಿರಿನಾಡುಗೆ ಸುಸ್ವಾಗತ";
  lang2.innerHTML = "ಕರ್ನಾಟಕದ ಪರಂಪರೆ";
}

function changeContentEng()
{
  lang.innerHTML = "Welcome to Sirinadu";
  lang2.innerHTML = "Heritage of Karnataka";
}

kannadaButton.addEventListener('click', changeContentKan);
englishButton.addEventListener('click', changeContentEng);

const chatForm = document.getElementById('chat-form');
const queryInput = document.getElementById('query');
const chatOutput = document.getElementById('chat-output');
const voiceSearchButton = document.getElementById('voice-search-button');
const kanButton = document.getElementById('kan');
const engButton = document.getElementById('eng');
let currentLanguage = 'en';

kanButton.addEventListener('click', () => {
    currentLanguage = 'kn';
});

engButton.addEventListener('click', () => {
    currentLanguage = 'en';
});

chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = queryInput.value;

    fetch('/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: message, language: currentLanguage })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`HTTP error! status: ${response.status}, message: ${err.message || JSON.stringify(err)}`);
            }).catch(() => {
                return response.text().then(text => {
                    throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
                });
            }
        );
        }
        return response.json();
    })
    .then(data => {
        console.log("Data from server:", data); // Check the structure of 'data'
        if (data.error) {
            console.error("Server error:", data.error);
            chatOutput.innerHTML += `<p style="color: red;">Error: ${data.error}</p>`;
        } else {
            const formattedResponse = formatChatOutput(data.response);
            chatOutput.innerHTML += `<em style="color: DarkSlateGray;">You: ${message}</em>`;
            chatOutput.innerHTML += `<br><em style="color: DarkSlateGray;">Wodeyar's AI:</em> ${formattedResponse}<br><br>`;

               // Toggle the border based on content inside
            if (chatOutput.innerHTML.trim() !== "") {
                 chatOutput.classList.add("has-content");
            } else {
                 chatOutput.classList.remove("has-content");
            }


        }
        queryInput.value = '';
    })
    .catch(error => {
        console.error("Fetch/JSON Error:", error);
        chatOutput.innerHTML += `<p style="color: red;">Error: ${error.message}</p>`;
    });
});

document.getElementById("voice-search-button").addEventListener("click", function () {
    // Get the language from a dropdown or default to English
    const languageSelector = document.getElementById("language-selector");
    const language = languageSelector ? languageSelector.value : 'en';  // Modify dynamically if a language dropdown is available
    
    // Notify the user that the speech recognition process has started
    document.getElementById("query").placeholder = "Listening...";

    fetch(`/speech?language=${language}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Place transcribed text into the search input
            document.getElementById("query").value = data.transcribed_text;
            document.getElementById("query").placeholder = "Search...";
        })
        .catch(error => {
            console.error('Error:', error);
            // Provide user feedback in case of an error
            document.getElementById("query").placeholder = "Voice search failed. Try again.";
        });
});

navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        console.log("Microphone access granted.");
        // Proceed with speech recognition or voice search function
    })
    .catch(function(err) {
        console.log("Microphone access denied or not available: " + err);
        alert("Please allow microphone access for voice search to work.");
    });

    function formatChatOutput(text) {
        // Replace **bold** with <strong>bold</strong>
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
        // Replace single asterisks * with <br> for a new line
        text = text.replace(/\*/g, '<br>');
    
        return text;
    }
