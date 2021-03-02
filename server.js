'use strict';
// ......................................................................................IMPORTS
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const path = require('path');
const pg = require('pg');
const methodOverride=require('method-override')

// ...............................................................................CONFIGURATIONS
let app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));


require('dotenv').config();
const PORT = process.env.PORT || 3000;

 const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
// const client = new pg.Client(process.env.DATABASE_URL);

// ...........................................................................ROUTERS END POINTS
app.get('/', handelHome);
app.get('/searches/new', handelSearchForm);
app.get('/books/:id', handelSingularBook);

// update data for the selected book when open rout '/update/
app.put('/books/:id' , handelUpdate )
app.post('/searches', hanelSearch);
app.post('/books', handleAddBook)
// Delete the selected book when open rout '/delete/'
app.delete('/books/:id', deleteBook);

app.get('*', handle404);
// ...........................................................................HANDLERS FUNCTIONS

function handleAddBook(req, res) {
    let book = req.body;

    let insertQUery = 'INSERT INTO books (author,title,isbn,image_url, description) VALUES ($1,$2,$3,$4,$5) RETURNING id;';
    let safeValues = [
        book.author,
        book.title,
        book.isbn,
        book.image,
        book.description
    ]

    client.query(insertQUery, safeValues)
        .then((data) => {
            console.log(data.rows[0])
            res.redirect('/books/' + data.rows[0].id);
        }).catch(err => console.log(err))

}

function handelHome(req, res) {
    let selectQuery = 'SELECT * FROM books;';

    client.query(selectQuery)
        .then(data => {
            res.render('pages/index', { data: data.rows, total: data.rowCount })
        })
        .catch(error => console.log(error))
}

function handelSingularBook(req, res) {
    let query = 'SELECT * FROM books where id =$1';
    let saveValue = [req.params.id];

    client.query(query, saveValue)
        .then(data => {
            res.render('pages/books/detail', { item: data.rows[0] });
        });
}

function handelSearchForm(req, res) {
    res.render('pages/searches/new')
}

function hanelSearch(req, res) {
    let url = 'https://www.googleapis.com/books/v1/volumes';

    const searchBook = req.body
    let objectOfData = {
        q: searchBook.search + ' in' + searchBook.term
    }

    superagent.get(url).query(objectOfData)
        .then(data => {
            let books = data.body.items.map(book => {
                return new BookResult(book);
            });
            res.render('pages/searches/show', { booksList: books });
        })
}

function handelUpdate(req , res ) {
    const searchBook = req.body;
    let saveValue = req.params.id;
console.log(searchBook)
    let updateQuery = 'UPDATE books SET author=$1 , title=$2 , isbn=$3 , description=$4 WHERE id=$5'
    let arrayOfUpdate = [searchBook.author,searchBook.title,searchBook.isbn,searchBook.description , saveValue]
    client.query(updateQuery , arrayOfUpdate)
    .then(()=> res.redirect(`/books/${saveValue}`))
}

function deleteBook(req , res ) {
    let SQL = 'DELETE FROM books WHERE id=$1';
  let value = req.params.id;
  return client.query(SQL, value)
    .then(res.redirect('/'))
}

function handle404(req, res) {
    res.send('404! this route dose not exist !!');
}

// ................................................................................. DATA MODEL
function BookResult(book) {
    var modifiedImg = book.volumeInfo.imageLinks.thumbnail.split(":")[1];
    this.title = book.volumeInfo.title || 'no title';
    this.author = book.volumeInfo.authors || 'Author unkown';
    this.description = book.volumeInfo.description || 'No discription';
    this.imgURL = `https:${modifiedImg}`;
}

client.connect()
    .then(() => {
        app.listen(PORT, () => console.log('server is running perfectly .. ', PORT))
    })
    .catch(error => console.log('error occured while connecting to database : ', error));
