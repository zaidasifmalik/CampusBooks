const { ExpressHandlebars } = require('express-handlebars');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const e = require('express');
const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});
exports.SendMessage = (req, res) => {
    if (req.session.user === undefined) {
        res.render('signin', { danger: 'Login First!', sess: req.session.user });
        console.log('nai chala');
    } else {
        console.log('chala');
        console.log(req.body);
        console.log(req.params);

        let BookId = req.params.Book_Id;
        const { message } = req.body;
        pool.getConnection((err, connection) => {
            if (err) throw err;
            connection.query(`SELECT id FROM books WHERE Book_Id = ?`, [BookId], (err, rows) => {
                if (err) throw err;
                const sellerId = rows[0].id; // get the seller id from the rows returned by the SELECT query
                connection.query('INSERT INTO messages SET buyer=?, seller=?, text=?, BookId=?', [req.session.user.Uid, sellerId, message, BookId], (err, rows) => {
                    connection.release();
                    if (err) throw err;
                    console.log('Message sent successfully!');
                    res.redirect(`/product/${BookId}`);
                });
            });
        });
    }
};


exports.view = (req, res) => {

    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log('connected as ID ' + connection.threadId);
        connection.query('SELECT * FROM personal_info,login WHERE personal_info.id = login.id', (err, rows) => {
            connection.release();
            if (!err) {
                res.render('admin', { rows, sess: req.session.user });
            } else {
                console.log(err)
            }
        });
    });
}

exports.find = (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log('connected as ID ' + connection.threadId);

        let searchTerm = req.body.search;

        connection.query('SELECT * FROM personal_info JOIN login on personal_info.id = login.id JOIN uni_details on personal_info.id = uni_details.id ORDER By first_name ASC', (err, rows) => {
            connection.release();
            if (!err) {
                res.render('admin', { rows, sess: req.session.user });
            } else {
                console.log(err)
            }
            // console.log('the data from user : ', rows);
        });


    });
}

exports.form = (req, res) => {
    if (req.session.user === undefined) {
        res.render('signin');
    }
    else {
        req.session.destroy();
        pool.getConnection((err, connection) => {
            if (err) throw err;
            console.log(`connected as id ` + connection.threadId);

            connection.query(`SELECT * FROM books WHERE In_Stock= 1`, (err, rows) => {
                connection.release();
                if (!err) {
                    res.render('home', { rows, sess: '' });
                }
                else {
                    console.log(err);
                }
                // console.log('The data from the user table: \n', rows)
            });
        });
    }
};

exports.register = (req, res) => {
    res.render('registeration');
}

exports.reg2 = (req, res) => {
    res.render('registeration2');
}

exports.signIn = (req, res) => {
    const { email, password } = req.body;
    let id;
    pool.getConnection((err, connection) => {
        if (err) throw err;
        connection.query('SELECT * FROM login', (err, rows) => {
            connection.release();
            let found = false;
            let noOfRecors = rows.length;
            for (i = 0; i < noOfRecors; i++) {
                if (rows[i].email === email && rows[i].password === password) {
                    found = true;
                    id = rows[i].id;
                    break;
                }
            }
            if (found === true) {
                connection.query('SELECT * FROM personal_info WHERE id = ?', [id], (err, rows) => {
                    if (err) throw err;
                    const User = {
                        Uid: rows[0].id,
                        f_name: rows[0].first_name,
                        l_name: rows[0].last_name,
                        image: rows[0].image,
                        gender: rows[0].gender,
                        city: rows[0].city,
                        type: rows[0].u_type
                    }
                    req.session.user = User;
                    req.session.save();
                    const image = rows[0].image;
                    connection.query(`SELECT * FROM books WHERE In_Stock= 1`, (err, rows) => {
                        if (!err) {
                            if (req.session.user.type === 'admin') {
                                res.render('home', { rows, sess: req.session.user, img: image, admin: "true" })
                            }
                            else {
                                res.render('home', { rows, sess: req.session.user, img: image });
                            }
                        }
                        else {
                            console.log(err);
                        }

                    });
                })
            }
            else {
                res.render('signin', { exist: "The email or password is incorrect" });
            }
        });
    });
}

exports.signOut = (req, res) => {
    req.session.destroy();
    res.render('signin', { success: 'User logged out' });
}

exports.currUser = (req, res) => {

    console.log('user : \n');
    res.render('signin', { success: `curr user : ${req.session.user}` });
}

exports.createAcc = (req, res) => {

    const { university, campus, batch, semester, gender, city, rollno } = req.body;
    const { f_name, l_name, email, password, password2 } = req.body;
    let imgFile;
    let uploadPath;
    let path;
    let path2;
    let newID;
    let name = 'def-pic.png';
    uploadPath = __dirname;
    path = uploadPath.slice(0, 31);
    if (!req.files || Object.keys(req.files).length === 0) {
        path2 = path + 'CampusBooks\\public\\images\\def-pic.png';
    }
    else {
        imgFile = req.files.profileimg;
        name = imgFile.name;
        path2 = path + 'CampusBooks\\public\\images\\' + imgFile.name;
    }
    let entry = '';
    let empty = false;
    if (f_name === '' || l_name === '' || email === '' || password === '' || password2 === '') {
        empty = true;
    }
    if (empty === true)
        res.render('registeration', { empty: `Please fill out all fields` });
    else {
        pool.getConnection((err, connection) => {
            if (err) throw err;
            console.log('connected as ID ' + connection.threadId);
            let failed = false;
            connection.query('SELECT * FROM login', (err, rows) => {
                if (!err) {
                    if (password != password2) {
                        failed = true;
                        res.render('registeration', { pass: "Passwords do not match!" });
                    }
                    let noOfRecors = rows.length;
                    let found = false;
                    for (i = 0; i < noOfRecors; i++) {
                        if (email === rows[i].email) {
                            found = true;
                            break;
                        }
                    }
                    if (found === true) {
                        failed = true;
                        res.render('registeration', { exist: "The entered email already exists!" })
                    }
                } else {
                    console.log(err)
                }
            });
            if (failed === false) {
                
                connection.query('INSERT INTO personal_info SET first_name = ?,last_name = ?,gender = ?,city = ?,image = ?', [f_name, l_name, gender, city, name], (err, rows) => {
                    if (err) throw err;
                    connection.query('SELECT * from personal_info', (err, rows2) => {
                        if (err) throw err
                        const newid = rows2[rows2.length - 1].id;
                        connection.query('INSERT INTO login SET email = ?,password = ?, id= ?', [email, password, newid], (err, rows) => {
                            if (err) throw err;
                            console.log('row inserted in login wih id : ', newid);
                        })
                        connection.query('INSERT INTO uni_details SET name = ?,campus =?, program=?,semester=?,rollno=?,id = ?', [university, campus, batch, semester, rollno, newid], (err, rows) => {
                            if (err) throw err;
                            console.log('row inserted in uni_details with id : ', newid);
                        })
                    })
                    res.render('registeration', { success: 'Registeration Successfull' })
                })
                // connection.query('INSERT INTO login SET email = ?,password = ?, id= ?', [email, password, newid], (err, rows) => {
                //     if (err) throw err;
                //     console.log('row inserted in login wih id : ', );
                // })
                // connection.query('INSERT INTO uni_details SET name = ?,campus =?, program=?,semester=?,rollno=?,id = ?', [university, campus, batch, semester, rollno, newid], (err, rows) => {
                //     if (err) throw err;
                //     console.log('row inserted in uni_details with id : ', newid);
                // })
                // }
                //const newid = (rows[rows.length - 1].id) + 1;
                // connection.query('INSERT INTO personal_info SET first_name = ?,last_name = ?,gender = ?,city = ?,image = ?', [f_name, l_name, gender, city, name], (err, rows) => {
                //     if (err) throw err;
                //     console.log('rows inserted in personal info with id : ', newid);
                // })
                // if (rows.length != 0) {
                //     connection.query('INSERT INTO login SET email = ?,password = ?, id= ?', [email, password, newid], (err, rows) => {
                //         if (err) throw err;
                //         console.log('row inserted in login wih id : ', newid);
                //     })
                // }
                // else {
                //     connection.query('INSERT INTO login SET email = ?,password = ?, id= ?', [email, password, newid2], (err, rows) => {
                //         if (err) throw err;
                //         console.log('row inserted in login wih id : ', newid2);
                //     })
                // }
                // if (rows.length != 0) {
                //     connection.query('INSERT INTO uni_details SET name = ?,campus =?, program=?,semester=?,rollno=?,id = ?', [university, campus, batch, semester, rollno, newid], (err, rows) => {
                //         if (err) throw err;
                //         console.log('row inserted in uni_details with id : ', newid);
                //     })
                // }
                // else {
                //     connection.query('INSERT INTO uni_details SET name = ?,campus =?, program=?,semester=?,rollno=?,id = ?', [university, campus, batch, semester, rollno, newid2], (err, rows) => {
                //         if (err) throw err;
                //         console.log('row inserted in uni_details with id : ', newid2);
                //     })
                // }
                //if (!err) {
                //      res.render('registeration', { success: 'Registeration Successfull' });
                //    }
                //  })
                if (name != 'def-pic.png') {
                    console.log("path : ", path2)
                    imgFile.mv(path2, function (err) {
                        if (err) return res.status(500).send(err);
                    })
                }
            }
        });
    }
}

exports.deleteuser = (req, res) => {
    const id = req.params.id;
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log('connected as ID ' + connection.threadId);
        connection.query('DELETE FROM personal_info WHERE id = ?', [req.params.id], (err, rows) => {
            connection.release();
            if (!err) {
                res.redirect('/admin');
            } else {
                console.log(err)
            }
            // console.log('the data from user : ', rows);
        });


    });
}

exports.viewProfile = (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        sqlQuery = 'Select * from personal_info JOIN login on personal_info.id  = login.id JOIN uni_details on personal_info.id = uni_details.id WHERE personal_info.id = ?';
        console.log('connected as ID ' + connection.threadId);
        connection.query(sqlQuery, [req.params.id], (err, rows) => {
            connection.release();
            if (!err) {
                res.render('profile', { rows });
                console.log(rows[0]);
            } else {
                console.log(err)
            }
        });
    });
}

exports.loaduser = (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log('connected as ID ' + connection.threadId);
        sqlQuery = 'Select * from personal_info JOIN login on personal_info.id  = login.id JOIN uni_details on personal_info.id = uni_details.id WHERE personal_info.id = ?';
        connection.query(sqlQuery, [req.params.id], (err, rows) => {
            connection.release();
            if (!err) {
                fname =
                    res.render('edit', { rows });
            } else {
                console.log(err)
            }
        });
    });
}

exports.editProfile = (req, res) => {
    const { university, campus, batch, semester, gender, city, rollno } = req.body;
    const { f_name, l_name, email, password, password2 } = req.body;
    let imgFile;
    let uploadPath;
    let path;
    let path2;
    let newID;
    let name;
    //let name = 'def-pic.png';
    uploadPath = __dirname;
    path = uploadPath.slice(0, 31);
    console.log("directory : ", path);
    if (!req.files || Object.keys(req.files).length === 0) {
        path2 = path + 'CampusBooks\\public\\images\\def-pic.png';
    }
    else {
        imgFile = req.files.profileimg;
        name = imgFile.name;
        path2 = path + 'CampusBooks\\public\\images\\' + imgFile.name;
    }
    if (name != 'def-pic.png') {
        console.log("path : ", path2)
        imgFile.mv(path2, function (err) {
            if (err) return res.status(500).send(err);
        })
    }
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log('connected as ID ' + connection.threadId);
        query1 = 'UPDATE personal_info SET first_name = ?, last_name = ?,image = ?,gender = ?,city = ? WHERE personal_info.id = ?';
        query2 = 'UPDATE login SET email = ?, password = ? where login.id = ?';
        query3 = 'UPDATE uni_details SET name = ?,campus = ?,program = ?,semester = ?, rollno = ? where uni_details.id = ?';
        connection.query(query1, [f_name, l_name, name, gender, city, req.params.id], (err, rows) => {
            if (err) throw err;
        });
        connection.query(query2, [email, password, req.params.id], (err, rows) => {
            if (err) throw err;
        })
        connection.query(query3, [university, campus, batch, semester, rollno, req.params.id], (err, rows) => {
            if (err) throw err;
            res.render('registeration', { success: 'User updated successfully' });
        })

    });
}

exports.showBooks = (req, res) => {

    //Connect to db
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log(`connected as id ` + connection.threadId);

        connection.query(`SELECT * FROM books WHERE In_Stock= 1`, (err, rows) => {
            connection.release();
            if (!err) {
                res.render('books', { rows, sess: req.session.user, img: req.session.user.image })
            }
            else {
                console.log(err);
            }
            console.log('The data from the user table: \n', rows)
        });
    });
}

exports.addBook = (req, res) => {
    res.render('addbooksRec', { sess: req.session.user });
}

exports.addBookRec = (req, res) => {

    let imgFile;
    let uploadPath;
    let path;
    let path2;

    if (req.files && req.files.profileimg) {
        imgFile = req.files.profileimg;
        uploadPath = __dirname;
        console.log(__dirname);
        path = uploadPath.slice(0, 31);
        path2 = path + 'CampusBooks\\public\\images\\' + imgFile.name;
        console.log("path", path2);
    }

    //console.log(`req body is`)
    const { bname, bEd, bAuth, bCond, bSem, bDesc, bSub, bPrice } = req.body;
    //res.render('AddBookRec');
    pool.getConnection((err, connection) => {
        if (err) throw err;
        //  console.log(`connected as id ` + connection.threadId);

        let searchterm = req.body.search;
        let bname1 = bname;
        let bEd1 = bEd;
        let bSub1 = bSub;
        let bSem1 = bSem;
        let bAuth1 = bAuth;
        let bPrice1 = bPrice;
        let bCond1 = bCond;
        let bDesc1 = bDesc;
        let emptyCols = [];

        if (!bname1) {
            emptyCols.push('Book Name');
        }
        if (bSub1 === "Select") {
            emptyCols.push('Subject');
        }
        if (bSem1 === "Select") {
            emptyCols.push('Semester');
        }
        if (!bAuth1) {
            emptyCols.push('Author Name');
        }
        if (!bPrice1) {
            emptyCols.push('Price');
        }
        if (bCond1 === "Select") {
            emptyCols.push('Book Condition');
        }
        if (!bDesc1) {
            emptyCols.push('Description');
        }
        if (!req.files || Object.keys(req.files).length === 0) {
            emptyCols.push('Image');
        }
        if (emptyCols.length > 0) {
            let alertMsg = `The following compalsury fields are empty: ${emptyCols.join(', ')}.`;
            res.render('AddBookRec', { alert: alertMsg, alertclass: "alert alert-danger alert-dismissible fade show" });
            return;
        }
        console.log(bname1, bEd1, bSub1, bSem1, bAuth1, bPrice1, bCond1, bDesc1);
        connection.query('INSERT INTO books SET Book_Name = ?,Book_Edition=?,Subject=?,Semester=?,Author_Name=?,Price=?,Description = ?,bImg = ?,Cond = ?,id=?', [bname, bEd, bSub, bSem, bAuth, bPrice, bDesc, imgFile.name, bCond, req.session.user.Uid], (err, rows) => {
            connection.release();
            if (!err) {
                res.render('addbooksRec', { alert: 'Book listed Successfully!', sess: req.session.user });
            }
            else {
                console.log(err);
            }
            // console.log('user entered: ', searchterm);
            //console.log('The data from the user table: \n', rows);
            imgFile.mv(path2, function (err) {
                if (err) return res.status(500).send(err);
            });
        });
    });
}

exports.home = (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log(`connected as id ` + connection.threadId);
        connection.query(`SELECT * FROM books WHERE In_Stock= 1`, (err, rows) => {
            connection.release();
            if (!err) {
                if (req.session.user != undefined && req.session.user.type === 'admin') {
                    res.render('home', { rows, sess: req.session.user, admin: "true" })
                }
                else {
                    res.render('home', { rows, sess: req.session.user })
                }
            }
            else {
                console.log(err);
            }
            //console.log('The data from the user table: \n', rows)
        });
    });
}
exports.messagePg = (req, res) => {
    if (req.session.user === undefined) {
        res.render('signin', { danger: 'Login First!', sess: req.session.user });
    }
    else {
        pool.getConnection((err, connection) => {
            if (err) throw err;
            connection.query(`SELECT p.first_name, p.last_name, l.email, m.time,m.text
            FROM personal_info p
            JOIN login l ON p.id = l.id
            JOIN messages m ON m.buyer = p.id
            WHERE m.seller = ?`
            , [req.session.user.Uid], (err, rows) => {
                connection.release();
                if (!err) {
                    res.render('messagePage', { rows, sess: req.session.user })
                }
                else {
                    console.log(err);
                }
                //console.log('The data from the user table: \n', rows)
            });
        })
    }
}
exports.wishlist = (req, res) => {
    if (req.session.user === undefined) {
        res.render('wishlist', { sess: req.session.user });
    }
    else {
        pool.getConnection((err, connection) => {
            if (err) throw err;
            connection.query('SELECT * FROM wishlist JOIN books ON wishlist.bookid = books.Book_Id WHERE user_id = ?', [req.session.user.Uid], (err, rows) => {
                if (err) throw err;
                res.render('wishlist', { rows, sess: req.session.user });
            })
        })
    }

}

exports.saveBook = (req, res) => {
    if (req.session.user === undefined) {
        res.render('signin', { danger: 'Login First!', sess: req.session.user });
    }
    else {
        book_id = req.params.Book_Id;
        pool.getConnection((err, connection) => {
            if (err) throw err;
            //console.log(`connected as id ` + connection.threadId);
            connection.query('INSERT INTO wishlist SET user_id = ?, bookid = ?', [req.session.user.Uid, book_id], (err, rows) => {
                if (err) throw err;
                connection.query(`SELECT * FROM books WHERE In_Stock= 1`, (err, rows) => {
                    connection.release();
                    if (!err) {
                        res.render('home', { rows, sess: req.session.user, msg: "Added to Wishlist" })
                    }
                    else {
                        console.log(err);
                    }
                    //console.log('The data from the user table: \n', rows)
                });
            })
        });
    }
}

exports.sellPage = (req, res) => {
    if (req.session.user === undefined) {
        res.render('signin', { danger: "Login First!", sess: req.session.user });
    }
    else {
        res.render('sell', { sess: req.session.user });
    }
}

exports.removeFromWishList = (req, res) => {
    pool.getConnection((err, connection) => {
        connection.release();
        if (err) throw err;
        const book_id = req.params.id;
        console.log('bookid : ', req.params.id);
        console.log('user id : ', req.session.user.Uid);
        connection.query("DELETE FROM wishlist WHERE bookid = ? AND user_id= ?", [book_id, req.session.user.Uid], (err, rows) => {
            if (err) throw err;
            res.redirect('/wishlist');
        })
    })
}

exports.showProfile = (req, res) => {
    if (req.session.user === undefined) {
        res.render('signin', { sess: req.session.user, danger: "Login First!" });
    }
    else {
        pool.getConnection((err, connection) => {
            if (err) throw err;
            sqlQuery = 'Select * from personal_info JOIN login on personal_info.id  = login.id JOIN uni_details on personal_info.id = uni_details.id WHERE personal_info.id = ?';
            console.log('connected as ID ' + connection.threadId);
            connection.query(sqlQuery, [req.session.user.Uid], (err, rows) => {
                connection.release();
                if (!err) {
                    res.render('profile', { rows, sess: req.session.user, img: req.session.user.image });
                    //console.log(rows[0]);
                } else {
                    console.log(err)
                }
            });
        });
    }
}

exports.deleteBook = (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        sqlQuery = 'DELETE FROM books where Book_Id = ?';
        console.log('connected as ID ' + connection.threadId);
        connection.query(sqlQuery, [req.params.id], (err, rows) => {
            connection.release();
            if (!err) {
                res.redirect('/books');
                //console.log(rows[0]);
            } else {
                console.log(err)
            }
        });
    });
}

exports.findBooks = (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log('connected as ID ' + connection.threadId);

        let searchTerm = req.body.search;
        console.log('search term : ', searchTerm);

        connection.query(`SELECT * FROM books Where Book_Name like ?`, ['%' + searchTerm + '%'], (err, rows) => {
            connection.release();
            if (!err) {
                res.render('home', { rows, sess: req.session.user });
            } else {
                console.log(err)
            }
            // console.log('the data from user : ', rows);
        });
    });
}

exports.prod = (req, res) => {
    const product = {
        id: req.body.Book_Id,
        title: req.body.Book_Name,
        sub: req.body.Subject,
        sem: req.body.Semester,
        ed: req.body.Book_Edition,
        auth: req.body.Author_Name,
        pricee: req.body.Price,
        cond: req.body.BCondition,
        desc: req.body.Description
    };
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log(`connected as id ` + connection.threadId);
        console.log(`siuu ` + req.params.Book_Id);
        connection.query(`SELECT * FROM books JOIN personal_info ON books.id = personal_info.id WHERE Book_Id= ?`, [req.params.Book_Id], (err, rows) => {
            connection.release();
            if (!err) {
                res.render('productDetails', { rows, sess: req.session.user })
            }
            else {
                console.log(err);
            }
            console.log('The data from the user table: \n', rows)
        });
    });
}

exports.nls = (req, res) => {
    console.log("user : ", req.session.user);
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log(`connected as id :`, connection.threadId);
        connection.query('Select * from login', (err, rows) => {
            connection.release();
            if (!err) {
                const { email } = req.body;
                let found = false;
                for (let i = 0; i < rows.length; i++) {
                    if (email === rows[i].email) {
                        found = true;
                        break;
                    }
                }
                if (found === false) {
                    res.render('signin', { exist: "You need to register first in order to recieve our newsletters!" });
                }
                else {
                    res.render('nls', { sess: req.session.user, email })
                }
            }
            else {
                console.log(err);
            }
        });
    });
}

exports.sub = (req, res) => {
    const { email, password } = req.body;
    let id;
    pool.getConnection((err, connection) => {
        if (err) throw err;
        connection.query('SELECT * FROM login', (err, rows) => {
            connection.release();
            let found = false;
            let noOfRecors = rows.length;
            for (i = 0; i < noOfRecors; i++) {
                if (rows[i].email === email && rows[i].password === password) {
                    found = true;
                    break;
                }
            }
            if (found === true) {
                res.render('nls', { sess: req.session.user, success: "You have successfully subscribed to out newsletter!" });
            }
            else {
                res.render('nls', { exist: "The email or password is incorrect" });
            }
        });
    });

}

exports.user_books = (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) throw err;
        sqlQuery = 'SELECT * FROM books JOIN personal_info on books.id = personal_info.id and personal_info.id = ?';
        console.log('connected as ID ' + connection.threadId);
        connection.query(sqlQuery, [req.params.id], (err, rows) => {
            connection.release();
            if (!err) {
                if (rows.length === 0) {
                    res.render('user-books', { sess: req.session.user })
                }
                else {
                    const seller = {
                        first_name: rows[0].first_name,
                        image: rows[0].image,
                        id: rows[0].id
                    }
                    res.render('user-books', { sess: req.session.user, rows, seller: seller })
                }
            } else {
                console.log(err)
            }
        });
    });
}

exports.sort = (req, res) => {
    const { sort } = req.body;
    let q = `SELECT * FROM books ORDER BY ${sort}`
    pool.getConnection((err, connection) => {
        if (err) throw err;
        connection.query(q, (err, rows) => {
            connection.release();
            if (!err) {
                if (req.session.user != undefined && req.session.user.type === 'admin') {
                    res.render('home', { rows, sess: req.session.user, admin: "true" })
                }
                else {
                    res.render('home', { rows, sess: req.session.user })
                }
            }
            else {
                console.log(err);
            }
            console.log('The data from the user table: \n', rows)
        });
    });
}

exports.sortUsers = (req, res) => {
    const { sort } = req.body;
    let sort2 = sort;
    if (sort === 'name') {
        sort2 = 'first_name,last_name';
    }
    if (sort === 'id') {
        sort2 = 'login.id';
    }
    let q = `SELECT * FROM login JOIN personal_info on login.id = personal_info.id JOIN uni_details ON uni_details.id = login.id ORDER BY ${sort2}`
    pool.getConnection((err, connection) => {
        if (err) throw err;
        connection.query(q, (err, rows) => {
            connection.release();
            if (!err) {
                if (req.session.user != undefined && req.session.user.type === 'admin') {
                    res.render('admin', { rows, sess: req.session.user, admin: "true" })
                }
                else {
                    res.render('admin', { rows, sess: req.session.user })
                }
            }
            else {
                console.log(err);
            }
            console.log('The data from the user table: \n', rows)
        });
    });
}

exports.notificationPage = (req, res) => {
    if (req.session.user === undefined) {
        res.render('notifications', { sess: req.session.user });
    }
    else {
        let q = `SELECT * FROM notifications JOIN personal_info on notifications.sender = personal_info.id WHERE notifications.receiver = ${req.session.user.Uid}`
        pool.getConnection((err, connection) => {
            if (err) throw err;
            connection.query(q, (err, rows) => {
                connection.release();
                if (!err) {
                    console.log(rows);
                    res.render('notifications', { rows, sess: req.session.user });
                }
                else {
                    console.log(err);
                }
            });
        });
    }


}

exports.banUser = (req, res) => {
    pool.getConnection((err, connection) => {
        let x = [req.params.id]
        if (err) throw err;
        query1 = `UPDATE personal_info SET status = 'banned' where id = ${x}`;
        console.log('connected as ID ' + connection.threadId);
        connection.query(query1, (err, rows) => {
            if (err) throw err
        });
        let query2 = `INSERT INTO notifications (sender,receiver,content) VALUES (${req.session.user.Uid},${x},'You have been banned from this platform due to suspicious behaviour! Contact us to get more information.')`
        connection.query(query2, (err, rows) => {
            connection.release();
            if (!err) {
                res.redirect(`/profile/${x}`);
            }
            else {
                throw (err)
            }
        })
    });
}

exports.removeNotification = (req, res) => {
    query1 = `DELETE FROM notifications WHERE notification_id = ${req.params.id}`;
    pool.getConnection((err, connection) => {
        if (err) throw err;
        connection.query(query1, (err, rows) => {
            connection.release();
            if (!err) {
                res.redirect('/notifications');
            } else {
                console.log(err)
            }
        });
    });

}

exports.filter = (req, res) => {
    const { uni, campus, sem } = req.body;
    if (uni === undefined && campus === undefined && sem === undefined) {
        res.redirect('/');
    }
    else {
        let count = 0;
        let query1 = "SELECT * FROM uni_details JOIN books ON uni_details.id = books.id WHERE "
        if (uni != undefined) {
            if (count === 0) {
                query1 = query1 + `name = '${uni}'`
            }
            else {
                query1 = query1 + ` AND name = '${uni}'`
            }
            count = count + 1;
        }
        if (campus != undefined) {
            if (count === 0) {
                query1 = query1 + `campus = '${campus}'`
            }
            else {
                query1 = query1 + ` AND campus = '${campus}'`
            }
            count = count + 1;
        }
        if (sem != undefined) {
            if (count === 0) {
                query1 = query1 + `books.semester = ${sem}`
            }
            else {
                query1 = query1 + ` AND books.semester = ${sem}`
            }
        }
        pool.getConnection((err, connection) => {
            if (err) throw err;
            connection.query(query1, (err, rows) => {
                connection.release();
                if (!err) {
                    if (req.session.user != undefined && req.session.user.type === 'admin') {
                        res.render('home', { rows, sess: req.session.user, admin: "true" });
                    }
                    else {
                        res.render('home', { rows, sess: req.session.user });
                    }
                } else {
                    console.log(err)
                }
            });
        });
    }

}
