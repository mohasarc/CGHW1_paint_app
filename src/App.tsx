import "./styles.css";
import { Container, Grid, Box } from "@mui/material";
import { StateManager } from "./util/StateManager";
import { Layers } from "./Components/Layers";
import ColorPicker from './Components/ColorPicker';
import ToolBox from "./Components/ToolBox";
import ToolBar from "./Components/ToolBar";
import PaintArea from "./Components/PaintArea";


export default function App() {
  // Initial value
  StateManager.getInstance().setState('picked-color', [0, 0, 0, 0]);
  StateManager.getInstance().setState('brush-size', 20);
  StateManager.getInstance().setState('selected-tool', 'brush');
  StateManager.getInstance().setState('timeline', [[{
    name: `New Layer (${1})`,
    z_index: 0,
    visible: true,
    id: `${0}`,
    shapes: [],
  }]]);
  StateManager.getInstance().setState('cur-timeline-node', 0);
  StateManager.getInstance().setState('cropping-layer', {
    name: `CropLayer`,
    z_index: 0,
    visible: true,
    id: `${0}`,
    shapes: [],
  });
  StateManager.getInstance().setState('layers', [{
    name: `New Layer (${1})`,
    z_index: 0,
    visible: true,
    id: `${0}`,
    shapes: [],
  }]);
  StateManager.getInstance().setState('selectedLayer', '0');

  return (
    <div className="App">
      <Container>
        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} >
          <Grid item xs={12} sm={12} md={12}>
            <Box mt={1} mb={2}>
              <ToolBar></ToolBar>
            </Box>
          </Grid>
          <Grid item xs={12} sm={12} md={12}>
            <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
              <Grid item xs={12} sm={6} md={2}>
                <ToolBox />
              </Grid>

              <Grid item xs={12} sm={6} md={6} >
                <PaintArea />
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <ColorPicker />
                <Box py={2}>
                  <Layers />
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}
