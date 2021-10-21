import * as React from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import InboxIcon from '@mui/icons-material/Inbox';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClearIcon from '@mui/icons-material/Clear';
import { Grid, Card, CardContent } from '@mui/material'
// import DraftsIcon from '@mui/icons-material/Drafts';

let count = 0;

export default function Layers(){

    return (
        <Card>
            <CardContent style={{backgroundColor: '#3b4245'}}>
                <Box
                    sx={{ width: '100%', height: 200, maxWidth: 350 }}
                    >
                    <List
                        sx={{
                          width: '100%',
                          maxWidth: 350,
                          bgcolor: 'background.dark',
                          position: 'relative',
                          overflow: 'auto',
                          maxHeight: 300,
                          '& ul': { padding: 0 },
                        }}
                            style={{backgroundColor: '#3b4245'}}
                      >
                        {[0, 1, 2,4,5,6,7,8,9,10].map((item) => (
                            <ListItem style={{width:'100%', maxWidth:350}}>
                                <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} >
                                  <Grid item xs={3} sm={3} md={3}>
                                    <Box px={1} py={0.5}>
                                        <ListItemButton sx={{width: '100%', maxWidth: 60}}>
                                            <ListItemIcon>
                                                <VisibilityIcon sx={{color:'white'}}/>
                                            </ListItemIcon>
                                        </ListItemButton>
                                    </Box>
                                  </Grid>
                                  <Grid item xs={6} sm={6} md={6}>
                                    <ListItemText primary={"Layer"+item} primaryTypographyProps={{variant:'body2', align: 'left', color: 'common.white' }} />
                                  </Grid>
                                  <Grid item xs={3} sm={3} md={3}>
                                    <Box px={1} py={0.5}>
                                        <ListItemButton>
                                            <ClearIcon sx={{color:'white'}}/>
                                        </ListItemButton>
                                    </Box>
                                  </Grid>
                                </Grid>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </CardContent>
        </Card>
    );
}