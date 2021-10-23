import "./styles.css";
import { Container, Grid, Box } from "@mui/material";
import { StateManager } from "./util/StateManager";
import ColorPicker from './Components/ColorPicker';
import { Layers } from "./Components/Layers";
import ToolBox from "./Components/ToolBox";
import ToolBar from "./Components/ToolBar";
import WorkArea from "./Components/WorkArea";


export default function App() {
  // Initial value
  StateManager.getInstance().setState('picked-color', [0, 0, 0, 0]);
  StateManager.getInstance().setState('brush-size', 20);
  StateManager.getInstance().setState('layers', [{
      name: `New Layer (${1})`,
      z_index: 0,
      visible: true,
      id: `${0}`,
      vertexData: [],
      colorData: [],
      brushSizeData: [],
  }]);
  StateManager.getInstance().setState('selectedLayer', '0');

  return (
    <div className="App">
      <Container>
        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} >
          <Grid item xs={12} sm={12} md={12}>
            <ToolBar></ToolBar>
          </Grid>
          <Grid item xs={12} sm={12} md={12}>
            <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
              <Grid item xs={12} sm={6} md={2}>
                <ToolBox />
              </Grid>

              <Grid item xs={12} sm={6} md={6} >
                <WorkArea />
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
