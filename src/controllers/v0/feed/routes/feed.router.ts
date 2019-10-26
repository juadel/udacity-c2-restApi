import { Router, Request, Response, response } from 'express';
import { FeedItem } from '../models/FeedItem';
import { requireAuth } from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';
import { get, request } from 'https';

const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
    items.rows.map((item) => {
            if(item.url) {
                item.url = AWS.getGetSignedUrl(item.url);
            }
    });
    res.send(items);
});

//@TODO
//Add an endpoint to GET a specific resource by Primary Key
router.get("/:id", async (req:Request, res: Response) =>{
    let {id}= req.params;
    if (isNaN(id)){
        return res.status(400).send(`Numeric ID is required`);
      }
    
    const items= await FeedItem.findByPk(id);
    if (items === null){
        return res.status(404).send(`This ID is not found`);
      }
    res.send(items);
});

// update a specific resource
router.patch('/:id', 
    requireAuth, 
    async (req: Request, res: Response) => {
        let{id}= req.params;
        let{caption, url} =req.body;
        if (isNaN(id)){
            return res.status(400).send(`Numeric ID is required`);
          }
        
        const item= await FeedItem.findByPk(id);
        if (item === null){
            return res.status(404).send(`This ID is not found`);
          }
        if (!caption) {
            return res.status(400).send({ message: 'Caption is required or malformed' });
        }
    
        // check Filename is valid
        if (!url) {
            return res.status(400).send({ message: 'File url is required' });
        }
        item.caption=caption;
        item.url=url; 
        item.save();
        res.send(item);
        

        

        //@TODO try it yourself
        //res.send(500).send("not implemented")
});


// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName', 
    requireAuth, 
    async (req: Request, res: Response) => {
    let { fileName } = req.params;
    const url = AWS.getPutSignedUrl(fileName);
    res.status(201).send({url: url});
});

// Post meta data and the filename after a file is uploaded 
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/', 
    requireAuth, 
    async (req: Request, res: Response) => {
    const caption = req.body.caption;
    const fileName = req.body.url;

    // check Caption is valid
    if (!caption) {
        return res.status(400).send({ message: 'Caption is required or malformed' });
    }

    // check Filename is valid
    if (!fileName) {
        return res.status(400).send({ message: 'File url is required' });
    }

    const item = await new FeedItem({
            caption: caption,
            url: fileName
    });

    const saved_item = await item.save();

    saved_item.url = AWS.getGetSignedUrl(saved_item.url);
    res.status(201).send(saved_item);
});

/*router.get('/filter/filter', 
    requireAuth,
    async (req:Request, res: Response) =>{
        let {img_url} = req.params;
        
        const https = require('http');
        console.log(img_url);

        https.get('http://localhost:8082/filteredimage?image_url=',${image_url}, (resp :Response) => {
          let data = '';
          console.log('Passed get request')
          // A chunk of data has been recieved.
          resp.on('data', (chunk) => {
            data += chunk;
            //console.log(data);
          });
        
          // The whole response has been received. Print out the result. 
          resp.on('end', () => {
            let newImage = data;
            //console.log(newImage);
            return res.status(200).sendFile(newImage);
          });
        
        }).on("error", (err:Error) => {
          console.log("Error: " + err.message);
        });

        

    });*/

    


export const FeedRouter: Router = router;