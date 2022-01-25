let db;

// establish connection to IndexedDB database called 'budget_tracker' and set it to version 1
const request = indexedDB.open('budget_tracker', 1);

// event triggers if database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function(event) {
  // save reference to database
  const db = event.target.result;
  // create object store (table) called 'new_budget', set it to have an auto incrementing primary key of sorts
  db.createObjectStore('new_budget', { autoIncrement: true });
};

request.onsuccess = function(event) {
  // when db is successfully created with its object store (from onupgradeneeded event above) or simply established a connection, save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run uploadBudget() function to send all local db data to api
  if (navigator.onLine) {
    uploadBudget();
  }
}

request.onerror = function(event) {
  // log error
  console.log(event.target.errorCode);
}

// function executed if attempt to submit a new budget with no internet connection
function saveRecord(record) {
  // open new transaction with database with read and write permissions
  const transaction = db.transaction(['new_budget'], 'readwrite');

  // access the object store for 'new_budget'
  const budgetObjectStore = transaction.objectStore('new_budget');

  // add record to your store with add method
  budgetObjectStore.add(record);
}

function uploadBudget() {
  // open transaction on your db
  const transaction = db.transaction(['new_budget'], 'readwrite');

  // access object store
  const budgetObjectStore = transaction.objectStore('new_budget');

  // get all records from store and set to variable
  const getAll = budgetObjectStore.getAll();

  // upon successful .getAll() execution
  getAll.onsuccess = function() {
    // if there was data in indexedDB's store, send to api server. Note that it's /api/transaction and not /api/budget due to route
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['new_budget'], 'readwrite');
          // access the new_budget object store
          const budgetObjectStore = transaction.objectStore('new_budget');
          // clear all items in your store
          budgetObjectStore.clear();

          alert('All saved transactions has been submitted!');
        })
        .catch(err => {
          console.log(err);
        });
    }
  }
}

// listen for app coming back online
window.addEventListener('online', uploadBudget);