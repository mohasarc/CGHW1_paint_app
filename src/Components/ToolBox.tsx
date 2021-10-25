import { useState } from 'react';
import { Grid, Card, CardHeader, CardContent, Button, Box, Divider, Slider } from '@mui/material';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import CheckBoxOutlineBlankOutlinedIcon from '@mui/icons-material/CheckBoxOutlineBlankOutlined';
import CircleOutlinedIcon from '@mui/icons-material/CircleOutlined';
import ChangeHistoryOutlinedIcon from '@mui/icons-material/ChangeHistoryOutlined';
import SelectAllOutlinedIcon from '@mui/icons-material/SelectAllOutlined';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';

import { convertToHex } from '../util/webglHelpers';
import { StateManager } from '../util/StateManager';

export default function ToolBox() {
    const [pickedColor, setPickedColor ] = useState('#000000');
    const [brushSize, setBrushSize] = useState(0);
    const [selectedTool, setSelectedTool] = useState('brush');

    StateManager.getInstance().subscribe('picked-color', () => {
        const initPickedColor: number[] = StateManager.getInstance().getState('picked-color');
        setPickedColor(convertToHex(initPickedColor.map(color => color * 255)));
    });

    StateManager.getInstance().subscribe('selected-tool', () => {
        setSelectedTool(StateManager.getInstance().getState('selected-tool'));
    });
    
    StateManager.getInstance().subscribe('brush-size', () => {
        setBrushSize(StateManager.getInstance().getState('brush-size'));
    });
    
    function handleBrushSizeChange(newSize: number) {
        StateManager.getInstance().setState('brush-size', newSize);
    }

    return (
            <Card>
                <CardHeader title={'Tool Box'} titleTypographyProps={{variant:'body2', align: 'center', color: 'common.white' }} style={{backgroundColor: '#323638'}} />
                <CardContent style={{backgroundColor: '#3b4245'}}>
                    <Box pb={2}>
                        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} >
                            <Grid item xs={12} sm={12} md={6}>
                                <Button 
                                    variant={selectedTool==='brush'?'outlined':"text"}
                                    onClick={() => {StateManager.getInstance().setState('selected-tool', 'brush')}}
                                >
                                    <BrushOutlinedIcon sx={{color:'white'}}/>
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={12} md={6}>
                                <Button
                                    variant={selectedTool==='eraser'?'outlined':"text"}
                                    onClick={() => {StateManager.getInstance().setState('selected-tool', 'eraser')}}
                                >
                                    <DriveFileRenameOutlineIcon sx={{color:'white'}} />
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={12} md={6}>
                                <Button
                                    variant={selectedTool==='crop'?'outlined':"text"}
                                    onClick={() => {StateManager.getInstance().setState('selected-tool', 'crop')}}
                                >
                                    <SelectAllOutlinedIcon sx={{color:'white'}}/>
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                    <Divider/>
                    <Box pt={2}>
                        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} >
                            <Grid item xs={12} sm={12} md={6}>
                                <Button
                                    variant={selectedTool==='rect'?'outlined':"text"}
                                    onClick={() => {StateManager.getInstance().setState('selected-tool', 'rect')}}
                                >
                                    <CheckBoxOutlineBlankOutlinedIcon sx={{color:'white'}}/>
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={12} md={6}>
                                <Button
                                    variant={selectedTool==='circle'?'outlined':"text"}
                                    onClick={() => {StateManager.getInstance().setState('selected-tool', 'circle')}}
                                >
                                    <CircleOutlinedIcon sx={{color:'white'}}/>
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={12} md={6}>
                                <Button
                                    variant={selectedTool==='triangle'?'outlined':"text"}
                                    onClick={() => {StateManager.getInstance().setState('selected-tool', 'triangle')}}
                                >
                                    <ChangeHistoryOutlinedIcon sx={{color:'white'}}/>
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                    <Divider/>
                    <Slider
                        size="small"
                        value={brushSize}
                        min={2}
                        aria-label="Small"
                        valueLabelDisplay="auto"
                        onChange={(event: any) => { handleBrushSizeChange(event.target.value) }}
                    />
                    <Divider/>
                    <Box mt={2} sx={{width: '100%', height: 40, backgroundColor: pickedColor, border: 1}}>
                    </Box>
                </CardContent>
            </Card>
        // </Box>
    );
}