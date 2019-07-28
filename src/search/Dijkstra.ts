import * as $N from '../core/BaseNode';
import * as $G from '../core/BaseGraph';
import * as $PFS from '../search/PFS';


/**
 * TODO Consider target node callbacks / messages
 * @param graph
 * @param v 
 */
function Dijkstra( graph   : $G.IGraph,
                   source  : $N.IBaseNode,
                   target? : $N.IBaseNode ) : {[id: string] : $PFS.PFS_ResultEntry} 
{
  let config = $PFS.preparePFSStandardConfig();

  if ( target ) {
    config.goal_node = target;
  }

  return $PFS.PFS( graph, source, config );
}

export {
  Dijkstra
};