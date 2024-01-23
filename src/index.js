// Import from "@inrupt/solid-client-authn-browser"
import {
  login,
  handleIncomingRedirect,
  getDefaultSession,
  fetch
} from "@inrupt/solid-client-authn-browser";

// Import from "@inrupt/solid-client"
import {
  addUrl,
  addStringNoLocale,
  createSolidDataset,
  createThing,
  getPodUrlAll,
  getSolidDataset,
  getThingAll,
  getStringNoLocale,
  removeThing,
  saveSolidDatasetAt,
  setThing,
  getFile, getContentType, isRawData, getSourceUrl, 
  getUrlAll
} from "@inrupt/solid-client";

import { SCHEMA_INRUPT, RDF, AS } from "@inrupt/vocab-common-rdf";

const MY_NAMESPACE = "http://example.org/my#";
const MY_SCHEMA = {
  name: `${MY_NAMESPACE}name`,
  date: `${MY_NAMESPACE}date`,
  firstName: `${MY_NAMESPACE}firstName`,
  lastName: `${MY_NAMESPACE}lastName`,
};
const selectorIdP = document.querySelector("#select-idp");
const selectorPod = document.querySelector("#select-pod");
const buttonLogin = document.querySelector("#btnLogin");
const buttonRead = document.querySelector("#btnRead");
const buttonViewList = document.querySelector("#btnViewMyList");


const labelCreateStatus = document.querySelector("#labelCreateStatus");

buttonRead.setAttribute("disabled", "disabled");
buttonViewList.setAttribute("disabled", "disabled");

// 1a. Start Login Process. Call login() function.
function loginToSelectedIdP() {
  const SELECTED_IDP = document.getElementById("select-idp").value;

  return login({
    oidcIssuer: SELECTED_IDP,
    redirectUrl: new URL("/", window.location.href).toString(),
    clientName: "Getting started app"
  });
}

// 1b. Login Redirect. Call handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {
  await handleIncomingRedirect(); // no-op if not part of login redirect

  const session = getDefaultSession();
  if (session.info.isLoggedIn) {
    document.getElementById("myWebID").value = session.info.webId;
    buttonRead.removeAttribute("disabled");
  }
}

handleRedirectAfterLogin();

// 2. Get Pod(s) associated with the WebID
async function getMyPods() {
  const webID = document.getElementById("myWebID").value;
  const mypods = await getPodUrlAll(webID, { fetch });

  const selectPod = document.getElementById('select-pod');
  selectPod.innerHTML = ''; // Pulisce le opzioni precedenti
  mypods.forEach((mypod) => {
    let podOption = document.createElement("option");
    podOption.textContent = mypod;
    podOption.value = mypod;
    selectPod.appendChild(podOption);
  });

  // Inizializza il menu a discesa Materialize dopo aver aggiunto le opzioni
  M.FormSelect.init(selectPod);

  // Attiva/disattiva il buttonUpload in base alla selezione del Pod
  if (selectPod.value !== null && selectPod.value !== "") {
    buttonViewList.removeAttribute("disabled");
  } else {
    buttonViewList.setAttribute("disabled", "disabled");
  }
 

  
}

// 3. Create the Reading List
async function createList() {
  labelCreateStatus.textContent = "";
  const SELECTED_POD = document.getElementById("select-pod").value;

  // For simplicity and brevity, this tutorial hardcodes the  SolidDataset URL.
  // In practice, you should add in your profile a link to this resource
  // such that applications can follow to find your list.
  const readingListUrl = `${SELECTED_POD}getting-started/readingList/myList`;

  let titles = document.getElementById("titles").value.split("\n");

  // Fetch or create a new reading list.
  let myReadingList;

  try {
    // Attempt to retrieve the reading list in case it already exists.
    myReadingList = await getSolidDataset(readingListUrl, { fetch: fetch });
    // Clear the list to override the whole list
    let items = getThingAll(myReadingList);
    items.forEach((item) => {
      myReadingList = removeThing(myReadingList, item);
    });
  } catch (error) {
    if (typeof error.statusCode === "number" && error.statusCode === 404) {
      // if not found, create a new SolidDataset (i.e., the reading list)
      myReadingList = createSolidDataset();
    } else {
      console.error(error.message);
    }
  }

  // Add titles to the Dataset
  let i = 0;
  titles.forEach((title) => {
    if (title.trim() !== "") {
      let item = createThing({ name: "title" + i });
      item = addUrl(item, RDF.type, AS.Article);
      item = addStringNoLocale(item, SCHEMA_INRUPT.name, title);
      myReadingList = setThing(myReadingList, item);
      i++;
    }
  });

  try {
    // Save the SolidDataset
    let savedReadingList = await saveSolidDatasetAt(
      readingListUrl,
      myReadingList,
      { fetch: fetch }
    );

    labelCreateStatus.textContent = "Saved";

    // Refetch the Reading List
    savedReadingList = await getSolidDataset(readingListUrl, { fetch: fetch });

    let items = getThingAll(savedReadingList);

    let listcontent = "";
    for (let i = 0; i < items.length; i++) {
      let item = getStringNoLocale(items[i], SCHEMA_INRUPT.name);
      if (item !== null) {
        listcontent += item + "\n";
      }
    }

    document.getElementById("savedtitles").value = listcontent;
  } catch (error) {
    console.log(error);
    labelCreateStatus.textContent = "Error" + error;
    labelCreateStatus.setAttribute("role", "alert");
  }
}

buttonLogin.onclick = function () {
  loginToSelectedIdP();
};

buttonRead.onclick = function () {
  getMyPods();
};
async function viewContent(resourceUrl) {
    const SELECTED_POD = document.getElementById("select-pod").value;
    try {
      const myReadingList = await getSolidDataset(resourceUrl, { fetch });
  
      const fileNodes = getThingAll(myReadingList);
  
      const predicatesToExtract = [
        MY_SCHEMA.name,
        MY_SCHEMA.firstName,
        MY_SCHEMA.lastName,
        MY_SCHEMA.date
      ];
  
      const listContainer = document.getElementById('listContainer');
      listContainer.innerHTML = ''; // Pulisce il contenuto precedente
  
      fileNodes.forEach((fileNode) => {
        const extractedData = {};
        predicatesToExtract.forEach((predicate) => {
          const value = getStringNoLocale(fileNode, predicate);
          const propertyName = predicate.split(/[#/]/).pop();
          const displayedPropertyName = propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
          extractedData[displayedPropertyName] = value;
        });
  
        const cardContainer = document.createElement('div');
        cardContainer.classList.add('file-card');
  
        Object.keys(extractedData).forEach((propertyName) => {
          const label = document.createElement('p');
          label.textContent = `${propertyName}: ${extractedData[propertyName]}`;
          cardContainer.appendChild(label);
        });

        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download';
        downloadButton.addEventListener('click', () => {
        const fileURL = getUrlAll(fileNode, SCHEMA_INRUPT.url)[0];
        const fileName = getStringNoLocale(fileNode, MY_SCHEMA.name);
        console.log("name",fileName);
        readFileFromPod(fileURL, fileName);
      });
      
     
      cardContainer.appendChild(downloadButton);
  
        listContainer.appendChild(cardContainer);
      });
    } catch (error) {
      console.error("Errore durante il recupero del contenuto:", error);
    }
  }
  
async function viewMyListContent() {
  
    const myListLink = document.getElementById("listInput").value;
    const linkCompleto = "https://storage.inrupt.com/"+ myListLink +"/healthcare/heart/myList";
    await viewContent(linkCompleto);

  }

  // Associa la funzione al clic di un pulsante
  const buttonViewMyList = document.querySelector("#btnViewMyList");
  buttonViewMyList.onclick = viewMyListContent;
  async function readFileFromPod(fileURL, name) {
    try {
      const file = await getFile(
        fileURL,
        { fetch: fetch }
      );
  
      const contentType = getContentType(file);
      console.log(`Fetched a ${contentType} file from ${getSourceUrl(file)}.`);
      if (isRawData(file)) {
        console.log("Il file è binario.");
        const arrayBuffer = await file.arrayBuffer();
  
        const blob = new Blob([new Uint8Array(arrayBuffer)], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.log("Il file non è binario e potrebbe essere un dataset RDF.");
      }
    } catch (err) {
      console.error("Errore durante la lettura del file dal Pod:", err);
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
  });

  document.addEventListener('DOMContentLoaded', function() {
    const toggleSection = document.getElementById('toggleSection');
    const sectionToToggle = document.getElementById('sectionToToggle');
    const toggleIcon = document.getElementById('toggleIcon');
  
    toggleSection.addEventListener('click', function() {
      // Cambia la visibilità della sezione
      if (sectionToToggle.style.display === 'none' || sectionToToggle.style.display === '') {
        sectionToToggle.style.display = 'block';
        toggleIcon.textContent = 'arrow_drop_up'; // Cambia l'icona a freccia su quando la sezione è visibile
      } else {
        sectionToToggle.style.display = 'none';
        toggleIcon.textContent = 'arrow_drop_down'; // Cambia l'icona a freccia giù quando la sezione è nascosta
      }
    });
  });

  



