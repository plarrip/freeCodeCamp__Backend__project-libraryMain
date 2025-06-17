/*
*
*
*       Complete the API routing below
*       
*       
*/

'use strict';

const { MongoClient, ObjectId } = require('mongodb');

let db;

// Initialize MongoDB connection
const initializeDatabase = async () => {
  try {
    // Check if DB environment variable exists
    if (!process.env.DB) {
      console.error('DB environment variable is not set!');
      console.log('Please add DB=your_mongodb_connection_string to your .env file');
      return;
    }

    console.log('Attempting to connect to MongoDB...');
    console.log('Connection string starts with:', process.env.DB.substring(0, 20) + '...');
    
    const client = await MongoClient.connect(process.env.DB, {
      useUnifiedTopology: true,
      useNewUrlParser: true
    });
    
    db = client.db();
    console.log('Successfully connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    console.log('Please check your DB connection string in .env file');
  }
};

// Initialize database connection
initializeDatabase();

module.exports = function (app) {

  app.route('/api/books')
    .get(async function (req, res){
      //response will be array of book objects
      //json res format: [{"_id": bookid, "title": book_title, "commentcount": num_of_comments },...]
      
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }
      
      try {
        const books = await db.collection('books').aggregate([
          {
            $project: {
              title: 1,
              commentcount: { 
                $size: { 
                  $ifNull: ['$comments', []] 
                } 
              }
            }
          }
        ]).toArray();
        
        res.json(books);
      } catch (err) {
        console.error('Error fetching books:', err);
        res.status(500).json({ error: 'Could not fetch books' });
      }
    })
    
    .post(async function (req, res){
      const title = req.body.title;
      //response will contain new book object including atleast _id and title
      
      if (!title) {
        return res.send('missing required field title');
      }
      
      try {
        const newBook = {
          title: title,
          comments: []
        };
        
        const result = await db.collection('books').insertOne(newBook);
        
        res.json({ 
          _id: result.insertedId, 
          title: title 
        });
      } catch (err) {
        console.error('Error creating book:', err);
        res.status(500).json({ error: 'Could not create book' });
      }
    })
    
    .delete(async function(req, res){
      //if successful response will be 'complete delete successful'
      
      try {
        await db.collection('books').deleteMany({});
        res.send('complete delete successful');
      } catch (err) {
        console.error('Error deleting all books:', err);
        res.status(500).json({ error: 'Could not delete books' });
      }
    });



  app.route('/api/books/:id')
    .get(async function (req, res){
      const bookid = req.params.id;
      //json res format: {"_id": bookid, "title": book_title, "comments": [comment,comment,...]}
      
      // Validate ObjectId format
      if (!ObjectId.isValid(bookid)) {
        return res.send('no book exists');
      }
      
      try {
        const book = await db.collection('books').findOne({ 
          _id: new ObjectId(bookid) 
        });
        
        if (!book) {
          return res.send('no book exists');
        }
        
        res.json({
          _id: book._id,
          title: book.title,
          comments: book.comments || []
        });
      } catch (err) {
        console.error('Error fetching book:', err);
        res.send('no book exists');
      }
    })
    
    .post(async function(req, res){
      const bookid = req.params.id;
      const comment = req.body.comment;
      //json res format same as .get
      
      if (!comment) {
        return res.send('missing required field comment');
      }
      
      // Validate ObjectId format
      if (!ObjectId.isValid(bookid)) {
        return res.send('no book exists');
      }
      
      try {
        const result = await db.collection('books').findOneAndUpdate(
          { _id: new ObjectId(bookid) },
          { $push: { comments: comment } },
          { returnDocument: 'after' }
        );
        console.log(result._id);
        
        if (!result._id) {
          return res.send('no book exists!');
        }
        
        res.json({
          _id: result._id,
          title: result.title,
          comments: result.comments
        });
      } catch (err) {
        console.error('Error adding comment:', err);
        res.send('no book exists');
      }
    })
    
    .delete(async function(req, res){
      const bookid = req.params.id;
      //if successful response will be 'delete successful'
      
      // Validate ObjectId format  
      if (!ObjectId.isValid(bookid)) {
        return res.send('no book exists');
      }
      
      try {
        const result = await db.collection('books').deleteOne({ 
          _id: new ObjectId(bookid) 
        });
        
        if (result.deletedCount === 0) {
          return res.send('no book exists');
        }
        
        res.send('delete successful');
      } catch (err) {
        console.error('Error deleting book:', err);
        res.send('no book exists');
      }
    });
  
};