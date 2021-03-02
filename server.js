'use strict';
// ......................................................................................IMPORTS
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const path = require('path');
const pg = require('pg');

// ...............................................................................CONFIGURATIONS
let app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs')

require('dotenv').config();
const PORT = process.env.PORT || 3000;

//  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const client = new pg.Client(process.env.DATABASE_URL);

// ...........................................................................ROUTERS END POINTS
app.get('/', handelHome);
app.get('/searches/new', handelSearchForm);
app.get('/books/:id', handelSingularBook);

app.post('/searches', hanelSearch);
app.post('/books', handleAddBook)

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



// add default values to the data base
// let dbQuery = 'INSERT INTO books (author, title,isbn,image_url, description) VALUES ($1, $2 , $3 , $4 , $5)';
// let saveValues = [
//     "Karen M. Ross",
//     "Index to the English Catalogue of Books ...",
//     "123-4567-789",
//     "http://books.google.com/books/content?id=LK7fAAAAMAAJ&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api",
//     "description An essential handbook for international lawyers and students Focusing on vocabulary, Essential Legal English in Context introduces the US legal system and its terminology. Designed especially for foreign-trained lawyers and students whose first language is not English, the book is a must-read for those who want to expand their US legal vocabulary and basic understanding of US government. Ross uses a unique approach by selecting legal terms that arise solely within the context of the levels and branches of US government, including terminology related to current political issues such as partisanship. Inspired by her students’ questions over her years of teaching"

// ]; 
