import {
    Grid,
    Card,
    CardContent,
    CardHeader,
    ListItemText,
    ListItemButton,
    ListItem,
    List,
    Box,
    IconButton,
    ButtonGroup
} from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useState } from 'react';

import { StateManager } from '../util/StateManager';

export interface Shape {
    vertexData: number[], // Vec2
    colorData: number[], // Vec4
    brushSize: number[],
    boundingRectData: number[], // Vec4
    type: 'point' | 'triangle' | 'dotted-triangle' | 'rectangle' | 'dotted-rectangle' | 'elipse' | 'dotted-elipse',
    center?: number[], // for elipse only
    size?: { w: number, h: number }, // for elipse only
}

export interface Layer {
    name: string,
    z_index: number,
    visible: boolean,
    id: string,
    shapes: Shape[],
}

let count = 1;

export function Layers() {
    const [layers, setLayers] = useState(StateManager.getInstance().getState('layers'));
    const [selectedLayer, setSelectedLayer] = useState(StateManager.getInstance().getState('selectedLayer'));

    StateManager.getInstance().subscribe('layers', () => {
        setLayers(StateManager.getInstance().getState('layers'));
    });

    StateManager.getInstance().subscribe('selectedLayer', () => {
        setSelectedLayer(StateManager.getInstance().getState('selectedLayer'))
    })

    function addLayer() {
        const newLayer = {
            name: `New Layer (${count + 1})`,
            z_index: layers.length,
            visible: true,
            id: `${count++}`,
            shapes: [],
            vertexData: [],
            colorData: [],
            brushSizeData: [],
            boundingRectData: [], // The rectangle enclosing the pixels of a particular shape
        };

        StateManager.getInstance().setState('layers', [{ ...newLayer }, ...layers]);
        StateManager.getInstance().setState('selectedLayer', newLayer.id);
    }

    function toggleVisibility(layerId: string) {
        const changingLayer = layers.find((layer: Layer) => layer.id === layerId);
        changingLayer.visible = !changingLayer.visible;
        const newLayers = layers.map((layer: Layer) => {
            if (layer.id == changingLayer.id)
                return changingLayer;
            else
                return layer;
        });

        StateManager.getInstance().setState('layers', [...newLayers]);
    }

    function selectLayer(layerId: string) {
        StateManager.getInstance().setState('selectedLayer', layerId);
    }

    function removeLayer(layerId: string) {
        const newLayers = layers.filter((layer: Layer) => layer.id !== layerId);
        const selectedLayerId = StateManager.getInstance().getState('selectedLayer');
        StateManager.getInstance().setState('layers', [...newLayers]);

        if (selectedLayerId === layerId) {
            StateManager.getInstance().setState('selectedLayer', newLayers[0] ? newLayers[0].id : '');
        }
    }

    function moveLayerUp(layerId: string) {
        const newLayers = [...layers];

        let movingLayerIndex: number = -1;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].id === layerId)
                movingLayerIndex = i;
        }

        if (movingLayerIndex > 0 && movingLayerIndex < layers.length) {
            newLayers[movingLayerIndex] = layers[movingLayerIndex - 1];
            newLayers[movingLayerIndex - 1] = layers[movingLayerIndex];
        }

        StateManager.getInstance().setState('layers', [...newLayers]);
    }

    function moveLayerDown(layerId: string) {
        const newLayers = [...layers];

        let movingLayerIndex: number = -1;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].id === layerId)
                movingLayerIndex = i;
        }

        if (movingLayerIndex >= 0 && movingLayerIndex < layers.length - 1) {
            newLayers[movingLayerIndex] = layers[movingLayerIndex + 1];
            newLayers[movingLayerIndex + 1] = layers[movingLayerIndex];
        }

        StateManager.getInstance().setState('layers', [...newLayers]);
    }

    return (
        <Card>
            <CardHeader title={'Layers'} titleTypographyProps={{ variant: 'body2', align: 'center', color: 'common.white' }} style={{ backgroundColor: '#323638' }} />
            <CardContent style={{ backgroundColor: '#3b4245' }}>
                <Box
                    sx={{ width: '100%', height: 142 }}
                >
                    <List
                        sx={{
                            width: '100%',
                            height: '100%',
                            bgcolor: 'background.dark',
                            position: 'relative',
                            overflow: 'auto',
                            '& ul': { padding: 0 },
                        }}
                        style={{ backgroundColor: '#3b4245' }}
                    >
                        <ListItem >
                            <ListItemButton style={{ width: '100%' }} onClick={addLayer}>
                                <AddIcon style={{ width: '100%' }} sx={{ color: 'white' }} />
                            </ListItemButton>
                        </ListItem>
                        {layers.map((item: Layer) => (
                            <ListItem style={{ backgroundColor: item.id === selectedLayer ? '#1e2224' : '' }}>
                                <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} >
                                    <Grid item xs={2} sm={2} md={2}>
                                        <Box>
                                            <IconButton id={item.id} onClick={(e) => { toggleVisibility(e.currentTarget.id) }}>
                                                {
                                                    item.visible
                                                        ? <VisibilityIcon sx={{ color: 'white' }} />
                                                        : <VisibilityOffIcon sx={{ color: 'white' }} />
                                                }
                                            </IconButton>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4} sm={4} md={4}>
                                        <Box>
                                            <ListItemButton id={item.id} onClick={(e) => { selectLayer(e.currentTarget.id) }}>
                                                <ListItemText primary={item.name} primaryTypographyProps={{ variant: 'body2', align: 'left', color: 'common.white' }} />
                                            </ListItemButton>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6} sm={6} md={6}>
                                        <ButtonGroup>
                                            <IconButton id={item.id} onClick={(e) => { moveLayerUp(e.currentTarget.id) }}>
                                                <ArrowDropUpIcon sx={{ color: 'white' }} />
                                            </IconButton>
                                            <IconButton id={item.id} onClick={(e) => { moveLayerDown(e.currentTarget.id) }}>
                                                <ArrowDropDownIcon sx={{ color: 'white' }} />
                                            </IconButton>
                                            <IconButton id={item.id} onClick={(e) => { removeLayer(e.currentTarget.id) }}>
                                                <ClearIcon sx={{ color: 'white' }} />
                                            </IconButton>
                                        </ButtonGroup>
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
